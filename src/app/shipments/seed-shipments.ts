/**
 * Idempotent demo-shipment seeder for the C-Star book. Run with:
 *   npx tsx src/app/shipments/seed-shipments.ts
 *
 * Safe to re-run: it keys on Shipment.reference within the C-Star entity and
 * UPDATES the matching row instead of inserting duplicates. It never wipes data.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

async function main() {
  const cstar = await prisma.entity.findFirst({ where: { name: "C-Star" } });
  if (!cstar) {
    throw new Error("C-Star entity not found — run the base seed first.");
  }

  // Optional link-ups so the demo rows feel real (all scoped to C-Star).
  const karachiOwn = await prisma.store.findFirst({
    where: { entityId: cstar.id, name: { contains: "Own Store" } },
  });
  const pcLahore = await prisma.party.findFirst({
    where: { entityId: cstar.id, name: "PC Lahore" },
  });
  const pcBurban = await prisma.party.findFirst({
    where: { entityId: cstar.id, name: "PC Burban" },
  });
  const pcKarachi = await prisma.party.findFirst({
    where: { entityId: cstar.id, name: "PC Karachi" },
  });

  const now = Date.now();

  const rows = [
    {
      reference: "DEMO-KHI-LHR-01",
      status: "in_transit",
      originName: karachiOwn?.name ?? "Karachi — Own Store",
      originCity: "Karachi",
      destinationName: "Lahore — PC Lahore",
      destinationCity: "Lahore",
      departureAt: new Date(now - 6 * HOUR),
      estimatedArrivalAt: new Date(now + 2 * DAY),
      carrier: "Daewoo Cargo",
      driverName: "Asif",
      driverPhone: "0300-1234567",
      originStoreId: karachiOwn?.id ?? null,
      partyId: pcLahore?.id ?? null,
    },
    {
      reference: "DEMO-KHI-ISB-02",
      status: "preparing",
      originName: karachiOwn?.name ?? "Karachi — Own Store",
      originCity: "Karachi",
      destinationName: "Islamabad — PC Burban",
      destinationCity: "Islamabad",
      departureAt: new Date(now + 12 * HOUR),
      estimatedArrivalAt: new Date(now + 3 * DAY),
      carrier: "NLC",
      driverName: "Rehman",
      driverPhone: "0321-7654321",
      originStoreId: karachiOwn?.id ?? null,
      partyId: pcBurban?.id ?? null,
    },
    {
      reference: "DEMO-KHI-MUX-03",
      status: "delayed",
      originName: karachiOwn?.name ?? "Karachi — Own Store",
      originCity: "Karachi",
      destinationName: "Multan depot",
      destinationCity: "Multan",
      departureAt: new Date(now - 2 * DAY),
      estimatedArrivalAt: new Date(now - 8 * HOUR), // overdue
      carrier: "Local transport",
      driverName: "Bilal",
      driverPhone: "0333-1112223",
      originStoreId: karachiOwn?.id ?? null,
      partyId: pcKarachi?.id ?? null,
    },
  ] as const;

  for (const r of rows) {
    const existing = await prisma.shipment.findFirst({
      where: { entityId: cstar.id, reference: r.reference },
    });
    const data = {
      reference: r.reference,
      status: r.status,
      originName: r.originName,
      originCity: r.originCity,
      destinationName: r.destinationName,
      destinationCity: r.destinationCity,
      departureAt: r.departureAt,
      estimatedArrivalAt: r.estimatedArrivalAt,
      deliveredAt: null as Date | null,
      carrier: r.carrier,
      driverName: r.driverName,
      driverPhone: r.driverPhone,
      entityId: cstar.id,
      originStoreId: r.originStoreId,
      partyId: r.partyId,
    };
    if (existing) {
      await prisma.shipment.update({ where: { id: existing.id }, data });
      console.log(`updated ${r.reference} (${r.originCity} → ${r.destinationCity}, ${r.status})`);
    } else {
      await prisma.shipment.create({ data });
      console.log(`created ${r.reference} (${r.originCity} → ${r.destinationCity}, ${r.status})`);
    }
  }
}

main()
  .then(() => console.log("Demo shipments seeded (idempotent)."))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
