/**
 * Read-only tools for the "Ask the ledger" assistant.
 *
 * SAFETY INVARIANTS (do not weaken):
 *  - Every tool is READ-ONLY. There are NO mutation tools — the assistant can
 *    never create/edit/delete data. Actions stay with the human.
 *  - Every query is scoped to ctx.entityId (the logged-in user's active book).
 *    The model's arguments never choose the book, so a SeaStar user's assistant
 *    can never read NF data and vice-versa.
 *  - Tools return plain JSON-serializable objects (Decimals → numbers, Dates →
 *    short strings). The model is instructed to report ONLY these numbers.
 */
import { prisma } from "@/lib/prisma";
import type { ActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { buildPartyLedger } from "@/lib/ledger";
import { buildWeeklyStatement } from "@/lib/reports";
import { monthlyPnL } from "@/lib/analytics";
import { etaHint, STATUS_LABELS } from "@/lib/shipments";
import { dateShort } from "@/lib/format";

export interface ToolDef {
  schema: {
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  };
  execute: (ctx: ActiveContext, args: Record<string, unknown>) => Promise<unknown>;
}

const num = (d: unknown) => Number(d ?? 0);
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const TOOLS: ToolDef[] = [
  // -------------------------------------------------------------------------
  {
    schema: {
      type: "function",
      function: {
        name: "get_party_balance",
        description:
          "How much a specific customer or supplier owes / is owed, as of today, with a few recent ledger entries. Use for any 'how much does X owe' question.",
        parameters: {
          type: "object",
          properties: {
            party: { type: "string", description: "party name or part of it, e.g. 'PC Lahore'" },
          },
          required: ["party"],
        },
      },
    },
    async execute(ctx, args) {
      const q = String(args.party ?? "").trim();
      if (!q) return { error: "No party name given." };
      const matches = await prisma.party.findMany({
        where: { ...entityScope(ctx), name: { contains: q } },
        select: { id: true, name: true, partyType: true, subType: true },
        take: 6,
      });
      if (matches.length === 0) return { found: false, query: q, note: "No matching party in this book." };
      if (matches.length > 1)
        return { found: "multiple", options: matches.map((m) => m.name), note: "Ask the user which one." };

      const p = matches[0];
      const ledger = await buildPartyLedger(ctx.entityId, p.id, undefined);
      const isSupplier = p.partyType === "supplier";
      return {
        found: true,
        name: p.name,
        type: p.partyType,
        // For a customer, positive = they owe us. For a supplier, we owe them.
        outstanding_pkr: round2(ledger.netOutstanding),
        direction: isSupplier
          ? "we owe this supplier"
          : ledger.netOutstanding >= 0
            ? "customer owes us"
            : "we owe this customer (credit)",
        recent: ledger.rows.slice(-4).map((r) => ({
          date: dateShort(r.date),
          detail: `${r.kind} ${r.ref}`.trim(),
          debit: r.debit || undefined,
          credit: r.credit || undefined,
          balance: r.balance,
        })),
      };
    },
  },

  // -------------------------------------------------------------------------
  {
    schema: {
      type: "function",
      function: {
        name: "net_position",
        description:
          "The book's overall money position right now: total receivables (owed to us by customers), total payables (owed to suppliers), the net, and the manual estimated bank balance.",
        parameters: { type: "object", properties: {} },
      },
    },
    async execute(ctx) {
      const st = await buildWeeklyStatement(ctx.entityId, new Date());
      const banks = await prisma.bankAccount.findMany({ where: entityScope(ctx) });
      return {
        book: ctx.entityName,
        receivables_pkr: round2(st.receivablesTotal),
        payables_pkr: round2(st.payablesTotal),
        net_pkr: round2(st.net),
        est_bank_balance_pkr: round2(banks.reduce((s, b) => s + num(b.estimatedBalance), 0)),
      };
    },
  },

  // -------------------------------------------------------------------------
  {
    schema: {
      type: "function",
      function: {
        name: "top_receivables",
        description:
          "Customers who owe us the most money right now (outstanding balance), highest first. Use for 'who owes me', 'kis se paise lene hain'.",
        parameters: {
          type: "object",
          properties: { limit: { type: "integer", description: "how many, default 8" } },
        },
      },
    },
    async execute(ctx, args) {
      const limit = Math.min(20, Math.max(1, Number(args.limit ?? 8)));
      const st = await buildWeeklyStatement(ctx.entityId, new Date());
      const rows = [...st.corporate, ...st.local]
        .filter((r) => r.outstanding > 0.5)
        .sort((a, b) => b.outstanding - a.outstanding)
        .slice(0, limit)
        .map((r) => ({
          party: r.name,
          outstanding_pkr: round2(r.outstanding),
          open_invoices: r.invoices.map((i) => `#${i.number}`).slice(0, 6),
        }));
      return { count: rows.length, receivables: rows };
    },
  },

  // -------------------------------------------------------------------------
  {
    schema: {
      type: "function",
      function: {
        name: "list_payables",
        description: "Suppliers we owe money to, highest first.",
        parameters: { type: "object", properties: {} },
      },
    },
    async execute(ctx) {
      const st = await buildWeeklyStatement(ctx.entityId, new Date());
      return {
        count: st.suppliers.length,
        payables: st.suppliers
          .sort((a, b) => b.outstanding - a.outstanding)
          .map((r) => ({ supplier: r.name, we_owe_pkr: round2(r.outstanding) })),
      };
    },
  },

  // -------------------------------------------------------------------------
  {
    schema: {
      type: "function",
      function: {
        name: "due_cheques",
        description:
          "Cheques due to clear within the next N days (default 7), incoming and outgoing, with status. Use for 'which cheques are due', 'cheque kab clear hoga'.",
        parameters: {
          type: "object",
          properties: { days: { type: "integer", description: "window in days, default 7" } },
        },
      },
    },
    async execute(ctx, args) {
      const days = Math.min(60, Math.max(1, Number(args.days ?? 7)));
      const until = new Date(Date.now() + days * 86400000);
      const cheques = await prisma.cheque.findMany({
        where: {
          ...entityScope(ctx),
          status: { in: ["issued", "pending", "held"] },
          clearingDue: { lte: until },
        },
        include: { bankAccount: { select: { bankName: true } } },
        orderBy: { clearingDue: "asc" },
        take: 30,
      });
      return {
        window_days: days,
        count: cheques.length,
        cheques: cheques.map((c) => ({
          number: c.chequeNumber,
          bank: c.bankAccount.bankName,
          amount_pkr: num(c.amount),
          direction: c.direction,
          status: c.status,
          due: c.clearingDue ? dateShort(c.clearingDue) : "—",
          recipient: c.recipientName ?? undefined,
        })),
      };
    },
  },

  // -------------------------------------------------------------------------
  {
    schema: {
      type: "function",
      function: {
        name: "profit_and_loss",
        description:
          "Monthly revenue, expenses and profit for the last N months (default 3). Revenue = customer invoice totals; expenses = expense entries. Use for 'profit', 'kitna kamaya', 'June ka hisaab'.",
        parameters: {
          type: "object",
          properties: { months: { type: "integer", description: "how many months back, default 3" } },
        },
      },
    },
    async execute(ctx, args) {
      const months = Math.min(12, Math.max(1, Number(args.months ?? 3)));
      const scope = entityScope(ctx);
      const customers = await prisma.party.findMany({
        where: { ...scope, partyType: "customer" },
        select: { id: true },
      });
      const custIds = customers.map((c) => c.id);
      const [invoices, expenses] = await Promise.all([
        prisma.invoice.findMany({
          where: { ...scope, partyId: { in: custIds } },
          select: { date: true, totalAmount: true },
        }),
        prisma.expenseEntry.findMany({ where: scope, select: { date: true, amount: true } }),
      ]);
      const pnl = monthlyPnL(
        invoices.map((i) => ({ date: i.date, amount: num(i.totalAmount) })),
        expenses.map((e) => ({ date: e.date, amount: num(e.amount) })),
        new Date(),
        months,
      );
      return {
        months: pnl.map((m) => ({
          month: m.label,
          revenue_pkr: round2(m.revenue),
          expenses_pkr: round2(m.expenses),
          profit_pkr: round2(m.profit),
        })),
        note: "Current month is month-to-date.",
      };
    },
  },

  // -------------------------------------------------------------------------
  {
    schema: {
      type: "function",
      function: {
        name: "find_invoices",
        description:
          "List recent invoices, optionally filtered by party name or status (draft/submitted/edited/printed). Shows total and remaining balance.",
        parameters: {
          type: "object",
          properties: {
            party: { type: "string" },
            status: { type: "string" },
            limit: { type: "integer", description: "default 8" },
          },
        },
      },
    },
    async execute(ctx, args) {
      const limit = Math.min(20, Math.max(1, Number(args.limit ?? 8)));
      const where: Record<string, unknown> = { ...entityScope(ctx) };
      if (args.party) where.party = { name: { contains: String(args.party) } };
      if (args.status) where.status = String(args.status);
      const invoices = await prisma.invoice.findMany({
        where,
        include: { party: { select: { name: true } }, payments: { select: { amount: true } } },
        orderBy: { invoiceNumber: "desc" },
        take: limit,
      });
      return {
        count: invoices.length,
        invoices: invoices.map((i) => {
          const paid = i.payments.reduce((s, p) => s + num(p.amount), 0);
          return {
            number: i.invoiceNumber,
            reference: i.referenceNumber ?? undefined,
            party: i.party.name,
            channel: i.channel,
            status: i.status,
            date: dateShort(i.date),
            total_pkr: num(i.totalAmount),
            balance_due_pkr: round2(num(i.totalAmount) - paid),
          };
        }),
      };
    },
  },

  // -------------------------------------------------------------------------
  {
    schema: {
      type: "function",
      function: {
        name: "inventory_summary",
        description:
          "Current stock on hand per store and item (cartons + kg), optionally filtered by item or store name. Use for 'kitna stock hai', 'how much Red Snapper'.",
        parameters: {
          type: "object",
          properties: { item: { type: "string" }, store: { type: "string" } },
        },
      },
    },
    async execute(ctx, args) {
      const scope = entityScope(ctx);
      const stores = await prisma.store.findMany({
        where: {
          ...scope,
          ...(args.store ? { name: { contains: String(args.store) } } : {}),
        },
        select: { id: true, name: true },
      });
      const storeIds = stores.map((s) => s.id);
      const storeName = new Map(stores.map((s) => [s.id, s.name]));
      const lines = await prisma.storeInventoryLine.findMany({
        where: {
          storeId: { in: storeIds },
          ...(args.item ? { item: { name: { contains: String(args.item) } } } : {}),
        },
        include: { item: { select: { name: true } } },
      });
      return {
        count: lines.length,
        stock: lines.map((l) => ({
          item: l.item.name,
          store: storeName.get(l.storeId) ?? "?",
          cartons: l.cartonCount,
          kg: round2(num(l.totalKg)),
        })),
      };
    },
  },

  // -------------------------------------------------------------------------
  {
    schema: {
      type: "function",
      function: {
        name: "active_shipments",
        description:
          "Shipments not yet delivered (preparing / in transit / delayed), with destination and ETA. Use for 'shipments', 'maal kahan hai', 'kaunsi delivery late hai'.",
        parameters: { type: "object", properties: {} },
      },
    },
    async execute(ctx) {
      const ships = await prisma.shipment.findMany({
        where: { ...entityScope(ctx), status: { notIn: ["delivered", "cancelled"] } },
        orderBy: { estimatedArrivalAt: "asc" },
        take: 20,
      });
      const now = new Date();
      return {
        count: ships.length,
        shipments: ships.map((s) => ({
          reference: s.reference ?? s.id.slice(0, 6),
          route: `${s.originCity ?? s.originName} → ${s.destinationCity}`,
          status: STATUS_LABELS[s.status as keyof typeof STATUS_LABELS] ?? s.status,
          eta: s.estimatedArrivalAt ? etaHint(s.estimatedArrivalAt, s.status, now).text : "—",
        })),
      };
    },
  },
];

export const TOOL_SCHEMAS = TOOLS.map((t) => t.schema);
const TOOL_BY_NAME = new Map(TOOLS.map((t) => [t.schema.function.name, t]));

/** Execute a tool by name with the given (scoped) context. Never throws to caller. */
export async function runTool(
  ctx: ActiveContext,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const tool = TOOL_BY_NAME.get(name);
  if (!tool) return { error: `Unknown tool: ${name}` };
  try {
    return await tool.execute(ctx, args);
  } catch (e) {
    return { error: `Tool ${name} failed: ${(e as Error).message}` };
  }
}
