import Link from "next/link";
import { getActiveContext } from "@/lib/session";

export const dynamic = "force-dynamic";

const REPORTS = [
  {
    href: "/reports/weekly",
    title: "Weekly statement",
    desc: "Who owes you and whom you owe, as of a date range — split corporate / local / suppliers. Printable / save as PDF.",
  },
  {
    href: "/reports/bad-debts",
    title: "Bad debts & disputes",
    desc: "Record write-offs and disputed amounts (linked to a party/invoice or free-text), split bad-debt vs dispute, with a printable summary.",
  },
];

export default async function ReportsHub() {
  const ctx = await getActiveContext();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Statements and ledgers for {ctx.entityName}.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="rounded-lg border border-slate-200 bg-white p-4 hover:border-cyan-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-800"
          >
            <div className="font-medium text-cyan-700 dark:text-cyan-400">{r.title} →</div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{r.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
