import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { CHEQUE_STATUSES } from "@/lib/enums";
import { pkr, dateShort } from "@/lib/format";
import { Card, Chip, StatusChip, PageHeader, Th } from "@/components/ui";
import {
  ChequeStatusButtons,
  OutgoingChequeForm,
  type FormBank,
} from "./ChequeControls";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function ChequesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const ctx = await getActiveContext();
  const scope = entityScope(ctx);

  const activeStatus =
    status && (CHEQUE_STATUSES as readonly string[]).includes(status) ? status : undefined;

  const [cheques, banks, allCheques] = await Promise.all([
    prisma.cheque.findMany({
      where: { ...scope, ...(activeStatus ? { status: activeStatus } : {}) },
      include: { bankAccount: true },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.bankAccount.findMany({ where: scope, orderBy: { bankName: "asc" } }),
    // Full set drives the stat cards regardless of the active filter.
    prisma.cheque.findMany({
      where: scope,
      select: { status: true, amount: true, clearingDue: true, createdAt: true },
    }),
  ]);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const in24h = new Date(now.getTime() + DAY_MS);

  // Stat-card aggregates (across all cheques in scope).
  const awaitingTotal = allCheques
    .filter((c) => c.status === "issued" || c.status === "pending" || c.status === "held")
    .reduce((s, c) => s + Number(c.amount), 0);
  const dueSoonCount = allCheques.filter(
    (c) =>
      (c.status === "issued" || c.status === "pending" || c.status === "held") &&
      c.clearingDue != null &&
      c.clearingDue.getTime() <= in24h.getTime(),
  ).length;
  const clearedThisWeek = allCheques
    .filter((c) => {
      if (c.status !== "cleared") return false;
      // No cleared-at timestamp exists; use the clearing-due date (fallback: created).
      const when = (c.clearingDue ?? c.createdAt).getTime();
      return when >= weekAgo.getTime() && when <= now.getTime();
    })
    .reduce((s, c) => s + Number(c.amount), 0);

  const formBanks: FormBank[] = banks.map((b) => ({
    id: b.id,
    label: `${b.bankName} · ${b.accountName}`,
  }));

  const tabs: { key: string | undefined; label: string }[] = [
    { key: undefined, label: "All" },
    ...CHEQUE_STATUSES.map((s) => ({ key: s, label: s })),
  ];

  return (
    <div className="animate-rise space-y-5">
      <PageHeader
        eyebrow="Money"
        title="Cheques"
        subtitle="Click a status action to move a cheque along — pending → cleared."
      />

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint2">
            Awaiting clearance
          </div>
          <div className="mt-1.5 font-mono text-[20px] font-semibold text-text">
            {pkr(awaitingTotal)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-warn">
            Due in 24 hours
          </div>
          <div className="mt-1.5 font-mono text-[20px] font-semibold text-warn">
            {dueSoonCount}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint2">
            Cleared this week
          </div>
          <div className="mt-1.5 font-mono text-[20px] font-semibold text-pos">
            {pkr(clearedThisWeek)}
          </div>
        </Card>
      </div>

      {/* Status filter chips */}
      <nav className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const isActive = activeStatus === t.key || (!activeStatus && t.key === undefined);
          const href = t.key ? `/cheques?status=${t.key}` : "/cheques";
          return (
            <Link
              key={t.label}
              href={href}
              data-testid={`filter-${t.key ?? "all"}`}
              className={`rounded-full border px-3 py-1 text-[12.5px] font-semibold capitalize transition-colors ${
                isActive
                  ? "border-transparent text-accent-deep"
                  : "border-hair bg-card text-muted hover:bg-card2"
              }`}
              style={isActive ? { background: "var(--accent-tint)" } : undefined}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <Th>Cheque</Th>
                <Th>Recipient</Th>
                <Th>Clearing due</Th>
                <Th>Status</Th>
                <Th align="right">Amount</Th>
                <Th align="right">Advance</Th>
              </tr>
            </thead>
            <tbody>
              {cheques.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3.5 py-6 text-center text-faint">
                    No cheques.
                  </td>
                </tr>
              ) : (
                cheques.map((c) => {
                  const dueSoon =
                    (c.status === "issued" || c.status === "pending" || c.status === "held") &&
                    c.clearingDue != null &&
                    c.clearingDue.getTime() <= in24h.getTime();
                  return (
                    <tr key={c.id} className="border-b border-row hover:bg-card2">
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[13px] font-semibold text-text">
                            #{c.chequeNumber}
                          </span>
                          <Chip tone={c.direction === "incoming" ? "accent" : "info"}>
                            {c.direction}
                          </Chip>
                        </div>
                        <div className="mt-0.5 text-[11.5px] text-faint">
                          {c.bankAccount.bankName}
                        </div>
                      </td>
                      <td className="px-3.5 py-3 text-[13px] text-text">
                        {c.recipientName ?? "—"}
                      </td>
                      <td className="px-3.5 py-3 text-[13px]">
                        <span className={dueSoon ? "font-mono text-warn" : "font-mono text-muted"}>
                          {c.clearingDue ? dateShort(c.clearingDue) : "—"}
                        </span>
                        {dueSoon && (
                          <Chip tone="warn" className="ml-2">
                            due soon
                          </Chip>
                        )}
                      </td>
                      <td className="px-3.5 py-3">
                        <StatusChip status={c.status} />
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-[13px] font-semibold text-text">
                        {pkr(Number(c.amount))}
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <ChequeStatusButtons id={c.id} status={c.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New outgoing cheque — "which cheque was given to whom" */}
      <Card className="p-[18px]">
        <h2 className="mb-1 font-serif text-[17px] font-semibold text-ink">
          New outgoing cheque
        </h2>
        <p className="mb-3 text-[12.5px] text-muted">
          Record a cheque NF hands onward to a party — the recipient is the &quot;given to whom&quot; record.
        </p>
        {formBanks.length === 0 ? (
          <p className="text-sm text-faint">
            Add a bank account first on the{" "}
            <Link href="/banks" className="font-semibold text-accent-deep hover:underline">
              Banks
            </Link>{" "}
            page.
          </p>
        ) : (
          <OutgoingChequeForm banks={formBanks} />
        )}
      </Card>
    </div>
  );
}
