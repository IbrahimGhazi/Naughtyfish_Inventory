import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { getAppConfig } from "@/lib/config";
import { PageHeader } from "@/components/ui";

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
  requirePage(ctx, "reports");
  const cfg = await getAppConfig();
  if (!cfg.features.reports) redirect("/");

  return (
    <div className="animate-rise space-y-5">
      <PageHeader
        eyebrow="Insight"
        title="Reports"
        subtitle={`Statements and ledgers for ${ctx.entityName}.`}
      />

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="group rounded-xl border border-hair bg-card p-[18px] transition-colors hover:border-hair2 hover:bg-card2"
          >
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="font-serif text-[18px] font-semibold text-ink">{r.title}</div>
                <p className="mt-1 text-[12.5px] text-muted">{r.desc}</p>
              </div>
              <div className="shrink-0 font-mono text-lg text-gold transition-transform group-hover:translate-x-0.5">
                ›
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
