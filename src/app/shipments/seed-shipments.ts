/**
 * Idempotent demo-shipment seeder for the SeaStar book. Run with:
 *   npx tsx src/app/shipments/seed-shipments.ts
 *
 * Safe to re-run: it keys on Shipment.reference within the SeaStar entity and
 * UPDATES the matching row instead of inserting duplicates. It never wipes data.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

async function main() {
  const cstar = await prisma.entity.findFirst({ where: { name: "SeaStar" } });
  if (!cstar) {
    throw new Error("SeaStar entity not found — run the base seed first.");
  }

  // Optional link-ups so the demo rows feel real (all scoped to SeaStar).
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

  const origin = karachiOwn?.name ?? "Karachi — Own Store";
  const storeId = karachiOwn?.id ?? null;

  const rows = [
    {
      reference: "DEMO-KHI-LHR-01",
      status: "in_transit",
      originName: origin,
      originCity: "Karachi",
      destinationName: "Lahore — PC Lahore",
      destinationCity: "Lahore",
      departureAt: new Date(now - 6 * HOUR),
      estimatedArrivalAt: new Date(now + 2 * DAY),
      deliveredAt: null as Date | null,
      carrier: "Daewoo Cargo",
      driverName: "Asif",
      driverPhone: "0300-1234567",
      note: null as string | null,
      originStoreId: storeId,
      partyId: pcLahore?.id ?? null,
    },
    {
      reference: "DEMO-KHI-ISB-02",
      status: "preparing",
      originName: origin,
      originCity: "Karachi",
      destinationName: "Islamabad — PC Burban",
      destinationCity: "Islamabad",
      departureAt: new Date(now + 12 * HOUR),
      estimatedArrivalAt: new Date(now + 3 * DAY),
      deliveredAt: null as Date | null,
      carrier: "NLC",
      driverName: "Rehman",
      driverPhone: "0321-7654321",
      note: null as string | null,
      originStoreId: storeId,
      partyId: pcBurban?.id ?? null,
    },
    {
      reference: "DEMO-KHI-MUX-03",
      status: "delayed",
      originName: origin,
      originCity: "Karachi",
      destinationName: "Multan depot",
      destinationCity: "Multan",
      departureAt: new Date(now - 2 * DAY),
      estimatedArrivalAt: new Date(now - 8 * HOUR), // overdue
      deliveredAt: null as Date | null,
      carrier: "Local transport",
      driverName: "Bilal",
      driverPhone: "0333-1112223",
      note: "Held at Kallar Kahar weigh station — ice topped up 6am.",
      originStoreId: storeId,
      partyId: pcKarachi?.id ?? null,
    },
    {
      reference: "DEMO-KHI-RWP-04",
      status: "in_transit",
      originName: origin,
      originCity: "Karachi",
      destinationName: "Rawalpindi Store",
      destinationCity: "Rawalpindi",
      departureAt: new Date(now - 18 * HOUR),
      estimatedArrivalAt: new Date(now + 1 * DAY),
      deliveredAt: null as Date | null,
      carrier: "NLC Truck",
      driverName: "Kamran",
      driverPhone: "0345-2223344",
      note: null as string | null,
      originStoreId: storeId,
      partyId: pcBurban?.id ?? null,
    },
    {
      reference: "DEMO-KHI-QTA-05",
      status: "preparing",
      originName: origin,
      originCity: "Karachi",
      destinationName: "Quetta wholesale",
      destinationCity: "Quetta",
      departureAt: new Date(now + 6 * HOUR),
      estimatedArrivalAt: new Date(now + 2 * DAY),
      deliveredAt: null as Date | null,
      carrier: "Reefer Van",
      driverName: "Nadeem",
      driverPhone: "0301-9988776",
      note: null as string | null,
      originStoreId: storeId,
      partyId: null,
    },
    {
      reference: "DEMO-KHI-PEW-06",
      status: "in_transit",
      originName: origin,
      originCity: "Karachi",
      destinationName: "Peshawar market",
      destinationCity: "Peshawar",
      departureAt: new Date(now - 10 * HOUR),
      estimatedArrivalAt: new Date(now + 3 * DAY),
      deliveredAt: null as Date | null,
      carrier: "NLC Truck · reefer",
      driverName: "Gul",
      driverPhone: "0311-4455667",
      note: null as string | null,
      originStoreId: storeId,
      partyId: null,
    },
    {
      reference: "DEMO-KHI-LHR-07",
      status: "delivered",
      originName: origin,
      originCity: "Karachi",
      destinationName: "Lahore — PC Lahore",
      destinationCity: "Lahore",
      departureAt: new Date(now - 4 * DAY),
      estimatedArrivalAt: new Date(now - 2 * DAY),
      deliveredAt: new Date(now - 2 * DAY),
      carrier: "Daewoo Cargo",
      driverName: "Asif",
      driverPhone: "0300-1234567",
      note: null as string | null,
      originStoreId: storeId,
      partyId: pcLahore?.id ?? null,
    },
    {
      reference: "DEMO-KHI-FSD-08",
      status: "delivered",
      originName: origin,
      originCity: "Karachi",
      destinationName: "Faisalabad depot",
      destinationCity: "Faisalabad",
      departureAt: new Date(now - 5 * DAY),
      estimatedArrivalAt: new Date(now - 3 * DAY),
      deliveredAt: new Date(now - 3 * DAY),
      carrier: "Reefer Van",
      driverName: "Tariq",
      driverPhone: "0302-6677889",
      note: null as string | null,
      originStoreId: storeId,
      partyId: null,
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
      deliveredAt: r.deliveredAt,
      carrier: r.carrier,
      driverName: r.driverName,
      driverPhone: r.driverPhone,
      notes: r.note,
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
