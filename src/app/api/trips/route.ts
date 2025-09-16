import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { TripRunCreate } from "@/lib/types";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as TripRunCreate;

    const created = await prisma.tripRun.create({
      data: {
        origin: payload.origin,
        destination: payload.destination,
        distanceMi: payload.distanceMi,
        durationMin: payload.durationMin,
        mpgUsed: payload.mpgUsed,
        fuelPrice: payload.fuelPrice,
        tollUsd: payload.tollUsd ?? null,
        co2Kg: payload.co2Kg,
        stops: payload.stops && payload.stops.length > 0 ? {
          createMany: {
            data: payload.stops.map((s) => ({
              name: s.name,
              lat: s.lat,
              lon: s.lon,
              pricePerGal: s.pricePerGal,
              detourMinutes: s.detourMinutes,
              gallonsPurchased: s.gallonsPurchased,
            })),
          },
        } : undefined,
      },
      include: { stops: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save trip" }, { status: 500 });
  }
}

export async function GET() {
  const trips = await prisma.tripRun.findMany({ orderBy: { createdAt: "desc" }, include: { stops: true } });
  return NextResponse.json(trips);
}


