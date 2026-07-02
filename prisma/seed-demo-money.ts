/**
 * Idempotent demo expenses + cheques for the C-Star book. Run with:
 *   npx tsx prisma/seed-demo-money.ts
 *
 * Safe to re-run: expenses key on their note text, cheques on chequeNumber
 * (both within C-Star). It UPDATES matches instead of inserting duplicates and
 * never wipes data. Amounts/dates are demo values.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

async function main() {
  const cstar = await prisma.entity.findFirst({ where: { name: "C-Star" } });
  if (!cstar) throw new Error("C-Star entity not found — run the base seed first.");
  const now = Date.now();

  // ---- Expenses (keyed by note) --------------------------------------------
  const cats = await prisma.expenseCategory.findMany({ where: { entityId: cstar.id } });
  const catId = (name: string) => cats.find((c) => c.name === name)?.id;

  const expenses = [
    { cat: "Fuel / Petrol", amount: 12500, at: now - 1 * DAY, note: "Reefer van diesel — Lahore run" },
    { cat: "Labor", amount: 18000, at: now - 2 * DAY, note: "Loading crew ×6 — night shift" },
    { cat: "Cartons", amount: 34000, at: now - 2 * DAY, note: "400 × 5-ply boxes" },
    { cat: "Packing", amount: 4400, at: now - 3 * DAY, note: "Ice + liners" },
    { cat: "Vehicle", amount: 7200, at: now - 5 * DAY, note: "Suzuki pickup service" },
    { cat: "Fuel / Petrol", amount: 6800, at: now - 6 * DAY, note: "Generator diesel" },
  ];

  for (const e of expenses) {
    const categoryId = catId(e.cat);
    if (!categoryId) {
      console.warn(`skip expense "${e.note}" — category "${e.cat}" not found`);
      continue;
    }
    const data = { amount: e.amount, date: new Date(e.at), note: e.note, categoryId, entityId: cstar.id };
    const existing = await prisma.expenseEntry.findFirst({ where: { entityId: cstar.id, note: e.note } });
    if (existing) {
      await prisma.expenseEntry.update({ where: { id: existing.id }, data });
      console.log(`updated expense "${e.note}"`);
    } else {
      await prisma.expenseEntry.create({ data });
      console.log(`created expense "${e.note}"`);
    }
  }

  // ---- Cheques (keyed by chequeNumber) -------------------------------------
  const bank = await prisma.bankAccount.findFirst({ where: { entityId: cstar.id } });
  if (!bank) {
    console.warn("no C-Star bank account — skipping cheques");
  } else {
    const cheques = [
      // Due within 24h → shows on the dashboard "cheques due" reminder.
      { no: "CHQ-002", direction: "incoming", status: "pending", amount: 605000, due: now + 20 * HOUR, issued: now - 2 * DAY, recipient: "PC Lahore", note: "Against invoice #101" },
      { no: "CHQ-003", direction: "incoming", status: "deposited", amount: 300000, due: now + 4 * DAY, issued: now - 1 * DAY, recipient: "PC Karachi", note: null },
      { no: "CHQ-004", direction: "incoming", status: "cleared", amount: 148000, due: now - 3 * DAY, issued: now - 9 * DAY, recipient: "PC Burban", note: null },
      { no: "CHQ-005", direction: "outgoing", status: "issued", amount: 96000, due: now + 2 * DAY, issued: now - 6 * HOUR, recipient: "Ittehad Fisheries", note: "Supplier settlement" },
    ];

    for (const c of cheques) {
      const clearingDue = new Date(c.due);
      const data = {
        chequeNumber: c.no,
        amount: c.amount,
        issueDate: new Date(c.issued),
        clearingDue,
        reminderDate: new Date(c.due - 1 * DAY), // 1 day before clearing
        direction: c.direction,
        status: c.status,
        recipientName: c.recipient,
        note: c.note,
        bankAccountId: bank.id,
        entityId: cstar.id,
      };
      const existing = await prisma.cheque.findFirst({ where: { entityId: cstar.id, chequeNumber: c.no } });
      if (existing) {
        await prisma.cheque.update({ where: { id: existing.id }, data });
        console.log(`updated cheque ${c.no} (${c.status})`);
      } else {
        await prisma.cheque.create({ data });
        console.log(`created cheque ${c.no} (${c.status})`);
      }
    }
  }
}

main()
  .then(() => console.log("Demo money seeded (idempotent)."))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
