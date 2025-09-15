"use client";

import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { LatLng } from "@/lib/types";
import L from "leaflet";
import { useEffect, useMemo } from "react";

type MapProps = {
  polyline?: LatLng[];
  markers?: { lat: number; lon: number; label?: string }[];
  height?: number;
};

export function Map({ polyline = [], markers = [], height = 360 }: MapProps) {
  const center = polyline.length > 0 ? [polyline[0].lat, polyline[0].lon] : [39.5, -98.35];

  // Configure default marker icons to avoid 404s
  const iconUrl = "/truck.png"; // served from public/truck.png
  const shadowUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";
  const DefaultIcon = L.icon({ iconUrl, iconRetinaUrl: iconUrl, shadowUrl, iconSize: [25,41], iconAnchor: [12,41] });
  L.Marker.prototype.options.icon = DefaultIcon;

  const bounds = useMemo(() => {
    if (!polyline || polyline.length < 2) return null;
    return L.latLngBounds(polyline.map(p => L.latLng(p.lat, p.lon)));
  }, [polyline]);

  function FitOnChange() {
    const map = useMap();
    useEffect(() => {
      if (bounds) {
        map.fitBounds(bounds, { padding: [30, 30] });
      } else {
        map.setView(center as [number, number], 5);
      }
    }, [bounds, center, map]);
    return null;
  }

  return (
    <div className="w-full rounded-xl overflow-hidden shadow-xl ring-1 ring-white/10" style={{ height }}>
      <MapContainer center={center as unknown as [number, number]} zoom={5} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitOnChange />
        {polyline.length > 1 && (
          <Polyline positions={polyline.map(p => [p.lat, p.lon]) as [number, number][]} color="#22d3ee" weight={6} opacity={0.8} />
        )}
        {markers.map((m, idx) => (
          <Marker key={idx} position={[m.lat, m.lon] as [number, number]}>
            {m.label && <Tooltip>{m.label}</Tooltip>}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}


