import { NextRequest, NextResponse } from "next/server";
import { FuelPriceResponse, LatLng } from "@/lib/types";

const EIA_API_KEY = process.env.EIA_API_KEY;

export async function GET(_req: NextRequest) {
  try {
    if (EIA_API_KEY) {
      // Weekly U.S. No 2 Diesel Retail Prices (all types) in USD/gal
      // Series ID: PET.EMD_EPD2D_PTE_NUS_DPG.W
      const url = new URL("https://api.eia.gov/v2/petroleum/pri/gnd/data/");
      url.searchParams.set("api_key", EIA_API_KEY);
      url.searchParams.set("frequency", "weekly");
      url.searchParams.set("data[0]", "value");
      url.searchParams.set("facets[product]", "EPD2D");
      url.searchParams.set("facets[process]", "RFG,CONV");
      url.searchParams.set("facets[area]", "NUS");
      url.searchParams.set("sort[0][column]", "period");
      url.searchParams.set("sort[0][direction]", "desc");
      url.searchParams.set("offset", "0");
      url.searchParams.set("length", "1");
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (res.ok) {
        const json = await res.json();
        const price = json?.response?.data?.[0]?.value;
        if (typeof price === "number") {
          const data: FuelPriceResponse = {
            dieselUsdPerGal: price,
            // Stops require a proper stops API; keep demo heuristics for now
            stops: [
              { name: "Love's Joliet, IL", lat: 41.5, lon: -88.08, pricePerGal: price - 0.1, detourMinutes: 6 },
              { name: "TA Oklahoma City, OK", lat: 35.45, lon: -97.53, pricePerGal: price - 0.2, detourMinutes: 10 },
              { name: "Pilot Dallas, TX", lat: 32.9, lon: -96.9, pricePerGal: price + 0.05, detourMinutes: 4 },
            ],
          };
          return NextResponse.json(data);
        }
      }
    }
  } catch {}

  const data: FuelPriceResponse = {
    dieselUsdPerGal: 4.15,
    stops: [
      { name: "Love's Joliet, IL", lat: 41.5, lon: -88.08, pricePerGal: 4.05, detourMinutes: 6 },
      { name: "TA Oklahoma City, OK", lat: 35.45, lon: -97.53, pricePerGal: 3.95, detourMinutes: 10 },
      { name: "Pilot Dallas, TX", lat: 32.9, lon: -96.9, pricePerGal: 4.20, detourMinutes: 4 },
    ],
  };
  return NextResponse.json(data);
}

// Generate dynamic candidate stops along a provided route polyline
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const polyline = (body?.polyline as LatLng[] | undefined) ?? [];
    // Get live price (or fallback)
    let dieselPrice = 4.15;
    try {
      if (EIA_API_KEY) {
        const url = new URL("https://api.eia.gov/v2/petroleum/pri/gnd/data/");
        url.searchParams.set("api_key", EIA_API_KEY);
        url.searchParams.set("frequency", "weekly");
        url.searchParams.set("data[0]", "value");
        url.searchParams.set("facets[product]", "EPD2D");
        url.searchParams.set("facets[process]", "RFG,CONV");
        url.searchParams.set("facets[area]", "NUS");
        url.searchParams.set("sort[0][column]", "period");
        url.searchParams.set("sort[0][direction]", "desc");
        url.searchParams.set("offset", "0");
        url.searchParams.set("length", "1");
        const res = await fetch(url, { next: { revalidate: 3600 } });
        if (res.ok) {
          const json = await res.json();
          const price = json?.response?.data?.[0]?.value;
          if (typeof price === "number") dieselPrice = price;
        }
      }
    } catch {}

    // If no polyline, just return price and empty stops
    if (!Array.isArray(polyline) || polyline.length < 2) {
      const data: FuelPriceResponse = { dieselUsdPerGal: dieselPrice, stops: [] };
      return NextResponse.json(data);
    }

    // Sample 4 evenly spaced points along the polyline, then find nearest real fuel POI
    const count = 4;
    const step = Math.max(1, Math.floor(polyline.length / (count + 1)));
    const candidates = Array.from({ length: count }, (_v, i) => polyline[(i + 1) * step]).filter(Boolean) as LatLng[];

    async function fetchNearestFuel(lat: number, lon: number) {
      // Overpass: nearest amenity=fuel within ~3km
      // nodes and ways; prefer nodes for precise location
      const query = `\n[out:json][timeout:15];\n(\n  node["amenity"="fuel"](around:3000,${lat},${lon});\n  way["amenity"="fuel"](around:3000,${lat},${lon});\n);\nout tags center 1;`;
      try {
        const res = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ data: query }),
          // cache lightly to be polite
          next: { revalidate: 600 },
        });
        if (!res.ok) return null;
        const json = await res.json();
        const el = json?.elements?.[0];
        if (!el) return null;
        const name = el.tags?.name || el.tags?.brand || "Fuel Station";
        const p = el.type === "node" ? { lat: el.lat, lon: el.lon } : { lat: el.center?.lat, lon: el.center?.lon };
        if (typeof p?.lat === "number" && typeof p?.lon === "number") {
          return { name, lat: p.lat, lon: p.lon } as { name: string; lat: number; lon: number };
        }
      } catch {}
      return null;
    }

    const nearestList = await Promise.all(candidates.map(c => fetchNearestFuel(c.lat, c.lon)));
    const stops = nearestList.map((n, idx) => {
      const base = candidates[idx];
      const lat = n?.lat ?? base.lat;
      const lon = n?.lon ?? base.lon;
      const name = n?.name ?? `Fuel Stop ${idx + 1}`;
      return {
        name,
        lat,
        lon,
        pricePerGal: parseFloat((dieselPrice + (idx % 2 === 0 ? -0.12 : 0.08)).toFixed(2)),
        detourMinutes: 3 + (idx * 2),
      };
    });

    const data: FuelPriceResponse = { dieselUsdPerGal: dieselPrice, stops };
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}


