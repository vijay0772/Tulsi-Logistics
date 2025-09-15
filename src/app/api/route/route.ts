import { NextRequest, NextResponse } from "next/server";
import { RouteResponse } from "@/lib/types";

const ORS_API_KEY = process.env.ORS_API_KEY;

// Mock fallback for demo: Chicago to Dallas
const fallbackPolyline = [
  { lat: 41.8781, lon: -87.6298 },
  { lat: 39.0997, lon: -94.5786 },
  { lat: 35.4676, lon: -97.5164 },
  { lat: 32.7767, lon: -96.797 },
];

async function geocode(text: string): Promise<{ lon: number; lat: number } | null> {
  // Try ORS geocoder first if available
  if (ORS_API_KEY) {
    try {
      const url = new URL("https://api.openrouteservice.org/geocode/search");
      url.searchParams.set("api_key", ORS_API_KEY);
      url.searchParams.set("text", text);
      url.searchParams.set("size", "1");
      url.searchParams.set("boundary.country", "US");
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = await res.json();
        const feature = data?.features?.[0];
        const coords = feature?.geometry?.coordinates;
        if (Array.isArray(coords) && coords.length >= 2) return { lon: coords[0], lat: coords[1] };
      }
    } catch {}
  }
  // Fallback to Nominatim
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", text);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "us");
    const res = await fetch(url.toString(), { headers: { "User-Agent": "tulsi-app/1.0" }, next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      const item = data?.[0];
      if (item?.lon && item?.lat) return { lon: parseFloat(item.lon), lat: parseFloat(item.lat) };
    }
  } catch {}
  return null;
}

async function directions(a: { lon: number; lat: number }, b: { lon: number; lat: number }) {
  if (!ORS_API_KEY) return null;
  const res = await fetch("https://api.openrouteservice.org/v2/directions/driving-car", {
    method: "POST",
    headers: {
      "Authorization": ORS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      coordinates: [
        [a.lon, a.lat],
        [b.lon, b.lat],
      ],
      geometry_format: "geojson",
      instructions: false,
      elevation: false,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const summary = data?.routes?.[0]?.summary;
  const geometry = data?.routes?.[0]?.geometry; // GeoJSON LineString
  if (!summary || !geometry || !Array.isArray(geometry?.coordinates)) return null;
  const coords: [number, number][] = geometry.coordinates; // [lon, lat]
  const polyline = coords.map(([lon, lat]) => ({ lat, lon }));
  return {
    distanceMi: summary.distance / 1609.344,
    durationMin: summary.duration / 60,
    polyline,
    waypoints: { origin: { lat: a.lat, lon: a.lon }, destination: { lat: b.lat, lon: b.lon } },
  } satisfies RouteResponse;
}

async function osrmDirections(a: { lon: number; lat: number }, b: { lon: number; lat: number }) {
  const url = new URL(`https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}`);
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return null;
  const data = await res.json();
  const route = data?.routes?.[0];
  if (!route?.geometry?.coordinates) return null;
  const coords: [number, number][] = route.geometry.coordinates;
  const polyline = coords.map(([lon, lat]) => ({ lat, lon }));
  return {
    distanceMi: route.distance / 1609.344,
    durationMin: route.duration / 60,
    polyline,
    waypoints: { origin: { lat: a.lat, lon: a.lon }, destination: { lat: b.lat, lon: b.lon } },
  } satisfies RouteResponse;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { origin, destination } = body as { origin: string; destination: string };

    const [a, b] = await Promise.all([geocode(origin), geocode(destination)]);
    if (a && b) {
      // Try ORS first if available, then OSRM
      if (ORS_API_KEY) {
        const route = await directions(a, b);
        if (route) return NextResponse.json(route);
      }
      const osrm = await osrmDirections(a, b);
      if (osrm) return NextResponse.json(osrm);
    }

    const data: RouteResponse = {
      distanceMi: 925,
      durationMin: 14 * 60,
      polyline: fallbackPolyline,
      waypoints: {
        origin: fallbackPolyline[0],
        destination: fallbackPolyline[fallbackPolyline.length - 1],
      },
    };
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}


