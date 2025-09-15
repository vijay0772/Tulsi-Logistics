-- CreateTable
CREATE TABLE "TripRun" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "distanceMi" REAL NOT NULL,
    "durationMin" REAL NOT NULL,
    "mpgUsed" REAL NOT NULL,
    "fuelPrice" REAL NOT NULL,
    "tollUsd" REAL,
    "co2Kg" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TripStop" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tripRunId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lon" REAL NOT NULL,
    "pricePerGal" REAL NOT NULL,
    "detourMinutes" REAL NOT NULL,
    "gallonsPurchased" REAL NOT NULL,
    CONSTRAINT "TripStop_tripRunId_fkey" FOREIGN KEY ("tripRunId") REFERENCES "TripRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
