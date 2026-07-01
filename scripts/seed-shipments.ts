/**
 * Idempotent demo-shipment seeder. Creates a few active shipments per entity so
 * the dashboard map/tracker has something to render. Safe to re-run: matches on
 * (entityId, reference) and updates in place — never wipes data.
 *
 *   npx tsx scripts/seed-shipments.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Demo {
  reference: string;
  status: string;
  originName: string;
  originCity: string;
  destinationName: string;
  destinationCity: string;
  daysToEta: number; // relative to now; may be negative for "delayed/overdue"
  carrier?: string;
}

const DEMOS: Demo[] = [
  {
    reference: "DEMO-SHIP-1",
    status: "in_transit",
    originName: "Karachi — Own Store",
    originCity: "Karachi",
    destinationName: "Lahore Store",
    destinationCity: "Lahore",
    daysToEta: 2,
    carrier: "Daewoo Freight",
  },
  {
    reference: "DEMO-SHIP-2",
    status: "in_transit",
    originName: "Karachi — Amir Store",
    originCity: "Karachi",
    destinationName: "Islamabad depot",
    destinationCity: "Islamabad",
    daysToEta: 3,
    carrier: "NLC",
  },
  {
    reference: "DEMO-SHIP-3",
    status: "preparing",
    originName: "Karachi — Own Store",
    originCity: "Karachi",
    destinationName: "Faisalabad wholesale",
    destinationCity: "Faisalabad",
    daysToEta: 5,
  },
  {
    reference: "DEMO-SHIP-4",
    status: "delayed",
    originName: "Karachi — Own Store",
    originCity: "Karachi",
    destinationName: "Multan market",
    destinationCity: "Multan",
    daysToEta: -1, // overdue
    carrier: "Local truck",
  },
];

async function main() {
  const now = Date.now();
  const entities = await prisma.entity.findMany({ select: { id: true, name: true } });

  for (const entity of entities) {
    for (const d of DEMOS) {
      const eta = new Date(now + d.daysToEta * 24 * 60 * 60 * 1000);
      const existing = await prisma.shipment.findFirst({
        where: { entityId: entity.id, reference: d.reference },
        select: { id: true },
      });

      const data = {
        reference: d.reference,
        status: d.status,
        originName: d.originName,
        originCity: d.originCity,
        destinationName: d.destinationName,
        destinationCity: d.destinationCity,
        departureAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
        estimatedArrivalAt: eta,
        carrier: d.carrier ?? null,
        entityId: entity.id,
      };

      if (existing) {
        await prisma.shipment.update({ where: { id: existing.id }, data });
      } else {
        await prisma.shipment.create({ data });
      }
    }
    console.log(`seeded ${DEMOS.length} demo shipments for ${entity.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
