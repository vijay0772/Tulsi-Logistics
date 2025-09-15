"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import dynamic from "next/dynamic";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { FuelPriceResponse, RouteResponse, TripStopCandidate } from "@/lib/types";
import { toast } from "sonner";
import fileDownload from "js-file-download";

function useRoute(origin: string, destination: string) {
  return useQuery<RouteResponse>({
    queryKey: ["route", origin, destination],
    queryFn: async () => {
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination }),
      });
      if (!res.ok) throw new Error("Failed to get route");
      return res.json();
    },
    enabled: !!origin && !!destination,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
}

function useFuel(polyline: RouteResponse["polyline"] | undefined) {
  return useQuery<FuelPriceResponse>({
    queryKey: ["fuel", polyline?.length ?? 0, polyline?.[0]?.lat, polyline?.[0]?.lon],
    queryFn: async () => {
      const res = await fetch("/api/fuel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ polyline }),
      });
      if (!res.ok) throw new Error("Failed to get fuel price");
      return res.json();
    },
    enabled: Array.isArray(polyline) && polyline.length > 1,
  });
}

const Map = dynamic(() => import("@/components/map/Map").then(m => m.Map), { ssr: false });

export default function DashboardTabs() {
  const [origin, setOrigin] = useState("Chicago, IL");
  const [destination, setDestination] = useState("Dallas, TX");
  const [mpg, setMpg] = useState(6.5);
  const [tankSize, setTankSize] = useState(200);
  const [fuelPct, setFuelPct] = useState(50);
  const [dieselPrice, setDieselPrice] = useState<number | null>(null);

  const routeQuery = useRoute(origin, destination);
  const { data: route, isFetching: loadingRoute, isError: routeError, refetch: refetchRoute } = routeQuery;
  const fuelQuery = useFuel(route?.polyline);
  const { data: fuel, isFetching: loadingFuel, refetch: refetchFuel } = fuelQuery;

  const gallonsNeeded = useMemo(() => (route ? route.distanceMi / mpg : 0), [route, mpg]);
  const co2Kg = useMemo(() => gallonsNeeded * 10.21, [gallonsNeeded]);
  const effectivePrice = dieselPrice ?? fuel?.dieselUsdPerGal ?? 0;
  const fuelCost = useMemo(() => gallonsNeeded * effectivePrice, [gallonsNeeded, effectivePrice]);
  const costPerMile = useMemo(() => (route ? fuelCost / route.distanceMi : 0), [route, fuelCost]);

  // Initialize editable diesel price from live price once when available
  useEffect(() => {
    if (dieselPrice === null && fuel?.dieselUsdPerGal) {
      setDieselPrice(parseFloat(fuel.dieselUsdPerGal.toFixed(3)));
    }
  }, [fuel?.dieselUsdPerGal, dieselPrice]);

  const stopsWithSavings = useMemo(() => {
    if (!fuel || !route) return [] as (TripStopCandidate & { savings: number })[];
    return fuel.stops.map((s) => {
      const base = fuel.dieselUsdPerGal;
      const savingsPerGal = Math.max(0, base - s.pricePerGal);
      const gallonsToBuy = Math.max(0, tankSize * (1 - fuelPct / 100));
      const detourPenalty = (s.detourMinutes / 60) * 30; // $30/hr time cost heuristic
      const savings = savingsPerGal * gallonsToBuy - detourPenalty;
      return { ...s, savings };
    }).sort((a, b) => b.savings - a.savings);
  }, [fuel, tankSize, fuelPct, route]);

  const exportCsv = () => {
    if (!route) return;
    const headers = [
      "Origin",
      "Destination",
      "Distance (mi)",
      "Duration (min)",
      "MPG",
      "Diesel ($/gal)",
      "Gallons",
      "Fuel Cost ($)",
      "CO2 (kg)",
      "Cost/mi ($)",
    ];
    const escapeCsv = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const row = [
      origin,
      destination,
      route.distanceMi.toFixed(1),
      route.durationMin.toFixed(0),
      mpg.toFixed(2),
      effectivePrice.toFixed(2),
      gallonsNeeded.toFixed(2),
      fuelCost.toFixed(2),
      co2Kg.toFixed(2),
      costPerMile.toFixed(3),
    ];
    const csv = [headers.map(escapeCsv).join(","), row.map(escapeCsv).join(",")].join("\n");
    fileDownload(csv, "esg-trip-report.csv");
    toast.success("CSV downloaded");
  };

  return (
    <Tabs defaultValue="route" className="w-full">
      <TabsList className="grid w-full grid-cols-4 bg-background/70 backdrop-blur">
        <TabsTrigger value="route">Route</TabsTrigger>
        <TabsTrigger value="stops">Fuel Stops</TabsTrigger>
        <TabsTrigger value="costs">Costs</TabsTrigger>
        <TabsTrigger value="co2">CO₂ / ESG</TabsTrigger>
      </TabsList>

      <TabsContent value="route" className="space-y-4">
        <Card className="bg-background/70 backdrop-blur">
          <CardHeader>
            <CardTitle>Plan Route</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-5 gap-4">
            <div className="md:col-span-2 grid gap-3">
              <div>
                <Label>Origin</Label>
                <Input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="City, State" />
              </div>
              <div>
                <Label>Destination</Label>
                <Input value={destination} onChange={e => setDestination(e.target.value)} placeholder="City, State" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Vehicle MPG</Label>
                  <Input type="number" value={mpg} onChange={e => setMpg(parseFloat(e.target.value))} />
                </div>
                <div>
                  <Label>Tank Size (gal)</Label>
                  <Input type="number" value={tankSize} onChange={e => setTankSize(parseFloat(e.target.value))} />
                </div>
                <div>
                  <Label>Current Fuel %</Label>
                  <Input type="number" value={fuelPct} onChange={e => setFuelPct(parseFloat(e.target.value))} />
                </div>
              </div>
              <Button
                onClick={async () => {
                  try {
                    const r = await refetchRoute();
                    await refetchFuel();
                    if (r.error) throw r.error;
                    toast.success("Route updated");
                  } catch (e) {
                    toast.error("Failed to update route");
                  }
                }}
                disabled={loadingRoute}
              >
                {loadingRoute ? "Updating..." : "Update"}
              </Button>
              {routeError && <div className="text-sm text-red-400">Failed to load route. Check API key or inputs.</div>}
              {route && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <div><b>Distance:</b> {route.distanceMi.toLocaleString()} mi</div>
                  <div><b>Duration:</b> {(route.durationMin/60).toFixed(1)} h</div>
                </div>
              )}
            </div>
            <div className="md:col-span-3">
              <Map polyline={route?.polyline} markers={fuel?.stops?.map(s => ({ lat: s.lat, lon: s.lon, label: s.name }))} height={380} />
              {loadingFuel && <div className="mt-2 text-xs text-white/80">Loading fuel stops…</div>}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="stops" className="space-y-4">
        <Card className="bg-background/70 backdrop-blur">
          <CardHeader>
            <CardTitle>Candidate Fuel Stops</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stop</TableHead>
                    <TableHead>Price ($/gal)</TableHead>
                    <TableHead>Detour (min)</TableHead>
                    <TableHead className="text-right">Net Savings ($)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stopsWithSavings.map((s) => (
                    <TableRow key={s.name} className={s.savings > 0 ? "bg-emerald-500/10" : ""}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{s.pricePerGal.toFixed(2)}</TableCell>
                      <TableCell>{s.detourMinutes}</TableCell>
                      <TableCell className="text-right">{s.savings.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="costs" className="space-y-4">
        <Card className="bg-background/70 backdrop-blur">
          <CardHeader>
            <CardTitle>Trip Costs</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">Fuel Cost = (distance / mpg) × price</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><b>Gallons Used:</b></div>
                <div>{gallonsNeeded.toFixed(2)} gal</div>
                <div><b>Diesel Price:</b></div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    className="h-9 w-28 rounded-md bg-background/60 border px-2"
                    value={effectivePrice.toFixed(2)}
                    onChange={(e) => setDieselPrice(Number(e.target.value) || 0)}
                  />
                  <span className="text-xs text-muted-foreground">$/gal</span>
                </div>
                <div><b>Fuel Cost:</b></div>
                <div>${fuelCost.toFixed(2)}</div>
                <div><b>Cost per Mile:</b></div>
                <div>${costPerMile.toFixed(3)}</div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label>MPG Sensitivity (±10%)</Label>
                <Slider defaultValue={[mpg]} min={mpg*0.9} max={mpg*1.1} step={0.1} onValueChange={(v) => setMpg(v[0])} />
              </div>
              <div>
                <Label>Price Sensitivity (±10%)</Label>
                <Slider
                  value={[effectivePrice]}
                  min={((fuel?.dieselUsdPerGal ?? effectivePrice) || 4) * 0.9}
                  max={((fuel?.dieselUsdPerGal ?? effectivePrice) || 4) * 1.1}
                  step={0.01}
                  onValueChange={(v) => setDieselPrice(parseFloat(v[0].toFixed(2)))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="co2" className="space-y-4">
        <Card className="bg-background/70 backdrop-blur">
          <CardHeader>
            <CardTitle>CO₂ / ESG</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2 text-sm">
              <div><b>Total CO₂:</b> {co2Kg.toFixed(2)} kg</div>
              <div><b>Per-Mile CO₂:</b> {route ? (co2Kg / route.distanceMi).toFixed(3) : 0} kg/mi</div>
            </div>
            <div className="flex items-end justify-end">
              <Button onClick={exportCsv}>Download ESG Report (CSV)</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}


