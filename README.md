# Tulsi Logistics — Fuel & Cost Optimization Platform

A modern trucking ops dashboard that optimizes routes, fuel stops, costs, and CO₂ — built with Next.js (App Router), TypeScript, Tailwind v4, shadcn/ui, React Query, Prisma, and Leaflet.

## ✨ Highlights
- Fullscreen looping truck video with dark overlay for an immersive UI
- Tabs: Route • Fuel Stops • Costs • CO₂/ESG
- Live routing via OpenRouteService (fallback to OSRM) and live diesel price via EIA
- Dynamic candidate fuel stops placed along the corridor (OSM Overpass names)
- KPIs: distance, duration, gallons, fuel cost, cost/mi, CO₂
- Editable diesel price and sensitivity sliders
- Interactive map with polyline and stop pins (custom truck icon)
- CSV ESG report export
- SQLite via Prisma (drop-in Postgres ready)

## 🧱 Tech Stack
- Next.js 15 (App Router), TypeScript
- Tailwind CSS v4 + shadcn/ui components
- React Query (TanStack)
- Prisma ORM + SQLite (dev) — ready for Postgres in prod
- React Leaflet + OpenStreetMap tiles

## 🚀 Quick Start
```bash
cd web
npm install
# create .env as below, then
npm run dev
```
Open `http://localhost:3000`.

## 🔑 Environment Variables (.env)
```env
DATABASE_URL="file:./dev.db"
# Optional: enable live routing and fuel price
ORS_API_KEY=your_openrouteservice_api_key
EIA_API_KEY=your_eia_api_key
```
- Routing: Uses ORS geocoding + directions. If missing/unavailable, falls back to OSRM public router.
- Fuel price: Uses EIA weekly U.S. diesel price (cached ~1h). If missing/unavailable, falls back to demo.

## 🧭 Features Walkthrough
- Route: Enter origin/destination, MPG, tank size, current fuel%. Click Update to fetch live route and re-fit the map.
- Fuel Stops: Shows corridor candidates with OSM names, detour penalty heuristic, and net savings ordering.
- Costs: Editable diesel price, KPIs, and MPG/price sensitivity.
- CO₂ / ESG: Calculates using 10.21 kg CO₂/gal. Export a clean CSV.

## 🗺️ Data Sources
- Routing: OpenRouteService (primary) → OSRM (fallback)
- Fuel price: U.S. EIA Open Data
- Stop names: OpenStreetMap Overpass API near sampled corridor points

## 🛠️ Development
- Prisma/SQLite is pre-initialized. Schema at `prisma/schema.prisma`.
- API routes live in `src/app/api/*`.
- Dashboard UI in `src/components/dashboard/Tabs.tsx`.
- Map in `src/components/map/Map.tsx`.

## ☁️ Deploy to Vercel
1) Push the `web` folder to GitHub.
2) On Vercel, import the repo and set the project root to `web`.
3) Add env vars (`DATABASE_URL`, optional `ORS_API_KEY`, `EIA_API_KEY`).
4) Build Command: `npm run build` • Output: `.next`

SQLite is fine for demos. For production:
- Switch `DATABASE_URL` to Postgres (Vercel Postgres or your provider)
- Run `npx prisma migrate deploy` on your deployment pipeline

## 🔮 Roadmap
- TollGuru integration for toll estimates
- Real truck-stop fuel prices (Love’s / Pilot / TA) if APIs are available
- PDF ESG report and richer sensitivity/tornado visuals
- Persistent trip history and sharing

## 🧩 Screens
- Fullscreen video background
- Tabs for Route / Stops / Costs / CO₂
- Interactive map with truck markers

Made with ❤️ for operators who care about margins and emissions.
