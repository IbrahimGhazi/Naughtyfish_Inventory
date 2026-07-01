/**
 * Seed — minimal, realistic starting data for local dev.
 *
 * ⚠️  All rates and glazing % below are PLACEHOLDERS. The source transcript
 * states NO rate anywhere, and its glazing figures are contradictory. These
 * MUST be replaced via the Data-Collection Gate (plan §8) before go-live.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // GUARD: this seed WIPES every table. If real business data exists (any
  // invoice or payment), refuse unless explicitly forced — one accidental
  // `npm run db:seed` must not destroy the dispute-defense evidence base.
  const [invoiceCount, paymentCount] = await Promise.all([
    prisma.invoice.count(),
    prisma.payment.count(),
  ]);
  if ((invoiceCount > 0 || paymentCount > 0) && process.env.FORCE_SEED !== "1") {
    console.error(
      `REFUSING to seed: database already has ${invoiceCount} invoice(s) and ` +
        `${paymentCount} payment(s). This command wipes ALL data.\n` +
        `Back up first (npm run db:backup), then re-run with FORCE_SEED=1 if you really mean it.`,
    );
    process.exit(1);
  }

  // Clean (dev only) — order respects FKs.
  await prisma.deliveryLineItem.deleteMany();
  await prisma.deliveryRecord.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.cheque.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.storeInventoryLine.deleteMany();
  await prisma.glazingSetting.deleteMany();
  await prisma.expenseEntry.deleteMany();
  await prisma.expenseCategory.deleteMany();
  await prisma.badDebtEntry.deleteMany();
  await prisma.referenceSeries.deleteMany();
  await prisma.storeScope.deleteMany();
  await prisma.item.deleteMany();
  await prisma.party.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();
  await prisma.entity.deleteMany();

  // --- Two books / entities -------------------------------------------------
  const cstar = await prisma.entity.create({ data: { name: "C-Star", bookType: "white" } });
  const nf = await prisma.entity.create({ data: { name: "NF", bookType: "black" } });

  // --- Admin user (C-Star + NF via "both") ----------------------------------
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.create({
    data: {
      name: "Owner (Admin)",
      loginId: "admin",
      passwordHash,
      role: "admin",
      entityAccess: "both",
      regionScope: "all",
      entityId: cstar.id,
    },
  });

  // --- Accountant + Delivery users (C-Star only) ----------------------------
  await prisma.user.create({
    data: {
      name: "Accountant",
      loginId: "accountant",
      passwordHash: await bcrypt.hash("acc123", 10),
      role: "accountant",
      entityAccess: "cstar",
      regionScope: "all",
      entityId: cstar.id,
    },
  });
  await prisma.user.create({
    data: {
      name: "Delivery / Data Entry",
      loginId: "delivery",
      passwordHash: await bcrypt.hash("del123", 10),
      role: "delivery",
      entityAccess: "cstar",
      regionScope: "all",
      entityId: cstar.id,
    },
  });

  // --- Items (placeholder rates & glazing — CONFIRM) ------------------------
  const items = [
    { name: "Red Snapper", category: "fish_fillet", cartonWeightKg: 20, packetsPerCarton: 10, isPrawn: false, fixedRate: 900, defaultGlazingPct: 3 },
    { name: "Mahi Mahi", category: "fish_fillet", cartonWeightKg: 15, packetsPerCarton: 10, isPrawn: false, fixedRate: 750, defaultGlazingPct: 3 },
    { name: "Brown (fillet)", category: "fish_fillet", cartonWeightKg: 13, packetsPerCarton: 10, isPrawn: false, fixedRate: 600, defaultGlazingPct: 3 },
    { name: "Finger Cut", category: "fish_fillet", cartonWeightKg: 10, packetsPerCarton: 10, isPrawn: false, fixedRate: 500, defaultGlazingPct: 0 },
    { name: "Biscuit Cut", category: "fish_fillet", cartonWeightKg: 10, packetsPerCarton: 10, isPrawn: false, fixedRate: 500, defaultGlazingPct: 0 },
    { name: "Prawn", category: "prawn", cartonWeightKg: 2, packetsPerCarton: 50, isPrawn: true, fixedRate: 1200, defaultGlazingPct: 50 },
  ];
  for (const entity of [cstar, nf]) {
    for (const it of items) {
      await prisma.item.create({ data: { ...it, entityId: entity.id } });
    }
  }

  // --- Stores (2 Karachi, Pindi, Lahore) ------------------------------------
  const storeDefs = [
    { name: "Karachi — Amir Store (rented)", city: "Karachi", region: "south", ownershipType: "rented" },
    { name: "Karachi — Own Store", city: "Karachi", region: "south", ownershipType: "own" },
    { name: "Rawalpindi Store", city: "Rawalpindi", region: "north", ownershipType: "own" },
    { name: "Lahore Store", city: "Lahore", region: "north", ownershipType: "own" },
  ];
  for (const s of storeDefs) {
    await prisma.store.create({ data: { ...s, entityId: cstar.id } });
  }

  // --- Parties: corporate customers, a local customer, a supplier -----------
  const parties = [
    { name: "PC Karachi", partyType: "customer", subType: "corporate", channel: "local", ntn: "1234567-8" },
    { name: "PC Lahore", partyType: "customer", subType: "corporate", channel: "north", ntn: "2345678-9" },
    { name: "PC Burban", partyType: "customer", subType: "corporate", channel: "north", ntn: "3456789-0" },
    { name: "Local Buyer (Empress Mkt)", partyType: "customer", subType: "local", channel: "local", ntn: null },
    { name: "Ittehad Fisheries (supplier)", partyType: "supplier", subType: null, channel: null, ntn: "4567890-1" },
  ];
  for (const p of parties) {
    await prisma.party.create({ data: { ...p, entityId: cstar.id } });
  }

  // --- Reference series (per book/region — start numbers UNKNOWN, placeholder 0)
  for (const region of ["Karachi", "Lahore", "Islamabad"]) {
    await prisma.referenceSeries.create({
      data: { prefix: "SSI-", bookRegion: region, currentNumber: 0, digitWidth: 6, entityId: cstar.id },
    });
  }

  // --- Bank account (manual estimated balance) ------------------------------
  await prisma.bankAccount.create({
    data: { bankName: "Meezan Bank", accountName: "C-Star", estimatedBalance: 500000, entityId: cstar.id },
  });

  // --- Glazing baselines (per item; drives variance alert) ------------------
  const cstarItems = await prisma.item.findMany({ where: { entityId: cstar.id, isPrawn: false } });
  for (const it of cstarItems) {
    await prisma.glazingSetting.create({
      data: { itemId: it.id, expectedGlazingPct: 3, varianceTolerancePct: 0, entityId: cstar.id },
    });
  }

  // --- Expense categories (flat, owner-editable) ----------------------------
  const cats = ["Fuel / Petrol", "Labor", "Cartons", "Packing", "Vehicle"];
  for (const entity of [cstar, nf]) {
    for (const name of cats) {
      await prisma.expenseCategory.create({ data: { name, entityId: entity.id } });
    }
  }

  console.log("Seed complete:");
  console.log("  Entities: C-Star (white), NF (black)");
  console.log("  Admin login → loginId: admin / password: admin123");
  console.log("  6 items × 2 books, 4 stores, 5 parties (incl. 1 supplier), 3 reference series, 1 bank.");
  console.log("  ⚠️  Rates & glazing % are PLACEHOLDERS — confirm via the Data-Collection Gate.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
