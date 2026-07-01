/**
 * Idempotent inventory fixtures — gives the two Karachi (C-Star) stores a little
 * starting stock so dispatch deduction can be browser-verified. Safe to re-run:
 * inventory lines are upserted to ABSOLUTE target quantities, and each seed
 * receive-movement is created at most once (tagged by note).
 *
 *   npx tsx prisma/seed-inventory-fixtures.ts
 *
 * NOT db:seed — this does not wipe anything.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_NOTE = "seed:starting-stock";

/** Target starting stock, keyed by (entity, store, item) NAMES. */
const FIXTURES: Array<{
  entity: string;
  store: string;
  item: string;
  cartons: number;
  packets: number;
  kgPerCarton: number;
  totalKg: number;
}> = [
  { entity: "C-Star", store: "Karachi — Own Store", item: "Red Snapper", cartons: 50, packets: 0, kgPerCarton: 20, totalKg: 1000 },
  { entity: "C-Star", store: "Karachi — Own Store", item: "Mahi Mahi", cartons: 20, packets: 0, kgPerCarton: 15, totalKg: 300 },
  { entity: "C-Star", store: "Karachi — Amir Store (rented)", item: "Red Snapper", cartons: 15, packets: 0, kgPerCarton: 20, totalKg: 300 },
  { entity: "C-Star", store: "Karachi — Amir Store (rented)", item: "Biscuit Cut", cartons: 10, packets: 100, kgPerCarton: 10, totalKg: 100 },
];

async function main() {
  for (const f of FIXTURES) {
    const entity = await prisma.entity.findFirst({ where: { name: f.entity } });
    if (!entity) {
      console.warn(`skip: entity "${f.entity}" not found`);
      continue;
    }
    const store = await prisma.store.findFirst({ where: { name: f.store, entityId: entity.id } });
    const item = await prisma.item.findFirst({ where: { name: f.item, entityId: entity.id } });
    if (!store || !item) {
      console.warn(`skip: store "${f.store}" or item "${f.item}" not found in ${f.entity}`);
      continue;
    }

    await prisma.storeInventoryLine.upsert({
      where: { storeId_itemId: { storeId: store.id, itemId: item.id } },
      create: {
        storeId: store.id,
        itemId: item.id,
        cartonCount: f.cartons,
        packetCount: f.packets,
        kgPerCarton: f.kgPerCarton,
        totalKg: f.totalKg,
      },
      update: {
        cartonCount: f.cartons,
        packetCount: f.packets,
        kgPerCarton: f.kgPerCarton,
        totalKg: f.totalKg,
      },
    });

    // Create the seed receive-movement only once (idempotent by note tag).
    const existingMovement = await prisma.stockMovement.findFirst({
      where: { entityId: entity.id, toStoreId: store.id, itemId: item.id, note: SEED_NOTE },
    });
    if (!existingMovement) {
      await prisma.stockMovement.create({
        data: {
          type: "receive",
          cartons: f.cartons,
          packets: f.packets,
          kg: f.totalKg,
          note: SEED_NOTE,
          toStoreId: store.id,
          itemId: item.id,
          entityId: entity.id,
        },
      });
    }

    console.log(`ok: ${f.store} / ${f.item} → ${f.cartons} cartons / ${f.totalKg} kg`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
