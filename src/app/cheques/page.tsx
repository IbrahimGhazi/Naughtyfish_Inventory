import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { CHEQUE_STATUSES } from "@/lib/enums";
import { pkr, dateShort } from "@/lib/format";
import {
  ChequeStatusButtons,
  OutgoingChequeForm,
  type FormBank,
} from "./ChequeControls";

export const dynamic = "force-dynamic";

const STATUS_CHIP: Record<string, string> = {
  issued: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  held: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  bounced: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  cleared: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

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

  const [cheques, banks] = await Promise.all([
    prisma.cheque.findMany({
      where: { ...scope, ...(activeStatus ? { status: activeStatus } : {}) },
      include: { bankAccount: true },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.bankAccount.findMany({ where: scope, orderBy: { bankName: "asc" } }),
  ]);

  const formBanks: FormBank[] = banks.map((b) => ({
    id: b.id,
    label: `${b.bankName} · ${b.accountName}`,
  }));

  const tabs: { key: string | undefined; label: string }[] = [
    { key: undefined, label: "All" },
    ...CHEQUE_STATUSES.map((s) => ({ key: s, label: s })),
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Cheque register</h1>

      {/* Tab-style status filter */}
      <nav className="flex flex-wrap gap-2 text-sm">
        {tabs.map((t) => {
          const isActive = activeStatus === t.key || (!activeStatus && t.key === undefined);
          const href = t.key ? `/cheques?status=${t.key}` : "/cheques";
          return (
            <Link
              key={t.label}
              href={href}
              data-testid={`filter-${t.key ?? "all"}`}
              className={`rounded-md border px-3 py-1 capitalize ${
                isActive
                  ? "border-cyan-600 bg-cyan-50 text-cyan-800 dark:border-cyan-500 dark:bg-cyan-950 dark:text-cyan-300"
                  : "border-slate-200 text-slate-600 hover:border-cyan-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-cyan-700"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400 dark:bg-slate-800/50 dark:text-slate-500">
            <tr>
              <th className="px-4 py-2">Number</th>
              <th className="px-4 py-2">Bank</th>
              <th className="px-4 py-2">Direction</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2">Issue</th>
              <th className="px-4 py-2">Due</th>
              <th className="px-4 py-2">Recipient</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {cheques.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">No cheques.</td>
              </tr>
            ) : (
              cheques.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2 font-mono">{c.chequeNumber}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{c.bankAccount.bankName}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs uppercase ${
                        c.direction === "incoming"
                          ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"
                          : "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                      }`}
                    >
                      {c.direction}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-medium">{pkr(Number(c.amount))}</td>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{c.issueDate ? dateShort(c.issueDate) : "—"}</td>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{c.clearingDue ? dateShort(c.clearingDue) : "—"}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{c.recipientName ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs uppercase ${STATUS_CHIP[c.status] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <ChequeStatusButtons id={c.id} status={c.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New outgoing cheque — "which cheque was given to whom" */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">New outgoing cheque</h2>
        <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
          Record a cheque NF hands onward to a party — the recipient is the "given to whom" record.
        </p>
        {formBanks.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Add a bank account first on the{" "}
            <Link href="/banks" className="text-cyan-700 underline dark:text-cyan-400">Banks</Link> page.
          </p>
        ) : (
          <OutgoingChequeForm banks={formBanks} />
        )}
      </section>
    </div>
  );
}
