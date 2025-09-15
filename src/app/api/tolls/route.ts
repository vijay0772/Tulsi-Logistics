import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Placeholder TollGuru: return zero tolls in demo
  return NextResponse.json({ tollUsd: 0 });
}


