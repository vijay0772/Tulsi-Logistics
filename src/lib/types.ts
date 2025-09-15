export type LatLng = { lat: number; lon: number };

export type RouteRequest = {
  origin: string;
  destination: string;
};

export type RouteResponse = {
  distanceMi: number;
  durationMin: number;
  polyline: LatLng[];
  waypoints: { origin: LatLng; destination: LatLng };
};

export type FuelPriceResponse = {
  dieselUsdPerGal: number;
  stops: TripStopCandidate[];
};

export type TripStopCandidate = {
  name: string;
  lat: number;
  lon: number;
  pricePerGal: number;
  detourMinutes: number;
};

export type CostsRequest = {
  distanceMi: number;
  mpg: number;
  dieselUsdPerGal: number;
  tollUsd?: number | null;
};

export type CostsResponse = {
  gallonsUsed: number;
  fuelCost: number;
  tollUsd: number;
  totalCost: number;
  costPerMile: number;
  potentialSavings?: number;
};

export type TripRunCreate = {
  origin: string;
  destination: string;
  distanceMi: number;
  durationMin: number;
  mpgUsed: number;
  fuelPrice: number;
  tollUsd?: number | null;
  co2Kg: number;
  stops?: {
    name: string;
    lat: number;
    lon: number;
    pricePerGal: number;
    detourMinutes: number;
    gallonsPurchased: number;
  }[];
};


