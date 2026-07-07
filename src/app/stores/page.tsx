import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { getAppConfig, getCopy } from "@/lib/config";
import { pkr, dateShort } from "@/lib/format";
import { Card, Chip, PageHeader, Th } from "@/components/ui";
import { AddCategoryForm } from "@/app/expenses/ExpenseControls";
import { AddStoreCostForm, type FormCategory } from "./StoreCostControls";

export const dynamic = "force-dynamic";

/**
 * Store management — per-store running costs (rent, wages, other, custom). Each
 * cost is an ExpenseEntry tagged with the store, so it rolls into the Expenses
 * page and dashboard P&L automatically. Gated on the "expenses" permission
 * because it is money data. One store is shown at a time via ?store=<id>.
 */
export default async function StoreCostsPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const ctx = await getActiveContext();
  requirePage(ctx, "expenses");
  const cfg = await getAppConfig();
  if (!cfg.features.expenses) redirect("/");
  const t = await getCopy();
  const scope = entityScope(ctx);

  const [stores, categories] = await Promise.all([
    prisma.store.findMany({ where: scope, orderBy: { name: "asc" }, select: { id: true, name: true, city: true } }),
    prisma.expenseCategory.findMany({ where: scope, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (stores.length === 0) {
    return (
      <div className="animate-rise space-y-5">
        <PageHeader eyebrow={t("stores.eyebrow")} title={t("stores.title")} subtitle={t("stores.subtitle")} />
        <p className="text-sm text-faint">{t("stores.noStores")}</p>
      </div>
    );
  }

  const { store: storeParam } = await searchParams;
  const selected = stores.find((s) => s.id === storeParam) ?? stores[0];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthAgg, totalAgg, entries] = await Promise.all([
    prisma.expenseEntry.aggregate({
      where: { ...scope, storeId: selected.id, date: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.expenseEntry.aggregate({
      where: { ...scope, storeId: selected.id },
      _sum: { amount: true },
    }),
    prisma.expenseEntry.findMany({
      where: { ...scope, storeId: selected.id },
      include: { category: true },
      orderBy: { date: "desc" },
      take: 50,
    }),
  ]);

  const monthTotal = Number(monthAgg._sum.amount ?? 0);
  const allTotal = Number(totalAgg._sum.amount ?? 0);
  const formCategories: FormCategory[] = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="animate-rise space-y-5">
      <PageHeader eyebrow={t("stores.eyebrow")} title={t("stores.title")} subtitle={t("stores.subtitle")} />

      {/* Store selector */}
      <div role="tablist" className="flex flex-wrap gap-1.5">
        {stores.map((s) => {
          const active = s.id === selected.id;
          return (
            <Link
              key={s.id}
              href={`/stores?store=${s.id}`}
              role="tab"
              aria-selected={active}
              data-testid={`store-tab-${s.id}`}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                active ? "text-on-accent" : "text-muted hover:bg-card2"
              }`}
              style={active ? { background: "var(--accent)" } : undefined}
            >
              {s.name}
            </Link>
          );
        })}
      </div>

      {/* Selected store: totals + add form */}
      <Card className="space-y-4 p-[18px]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-serif text-[18px] font-semibold text-ink">{selected.name}</div>
            {selected.city && <div className="text-[12px] text-muted">{selected.city}</div>}
          </div>
          <div className="flex gap-3">
            <Stat label={t("stores.thisMonth")} value={pkr(monthTotal)} />
            <Stat label={t("stores.allTime")} value={pkr(allTotal)} />
          </div>
        </div>

        <div className="border-t border-hair2 pt-4">
          <div className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint2">
            {t("stores.addHeading")}
          </div>
          {categories.length === 0 ? (
            <p className="text-sm text-faint">{t("stores.noCategories")}</p>
          ) : (
            <AddStoreCostForm storeId={selected.id} categories={formCategories} />
          )}
        </div>

        {/* Custom category add (rent, wages, electricity, …) */}
        <div className="border-t border-hair2 pt-3">
          <div className="mb-1.5 text-[11px] font-semibold text-faint2">{t("stores.customLabel")}</div>
          <AddCategoryForm />
        </div>
      </Card>

      {/* Recent costs for this store */}
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint2">
          {t("stores.recentHeading")}
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-faint">{t("stores.noEntries")}</p>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <Th className="w-[110px]">{t("stores.colDate")}</Th>
                    <Th className="w-[160px]">{t("stores.colCategory")}</Th>
                    <Th>{t("stores.colNote")}</Th>
                    <Th align="right">{t("stores.colAmount")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b border-row hover:bg-card2">
                      <td className="px-3.5 py-3 font-mono text-[12.5px] text-muted">{dateShort(e.date)}</td>
                      <td className="px-3.5 py-3">
                        <Chip tone="neutral">{e.category.name}</Chip>
                      </td>
                      <td className="px-3.5 py-3 text-[13px] text-text">{e.note ?? "—"}</td>
                      <td className="px-3.5 py-3 text-right font-mono text-[13px] font-semibold text-neg">
                        {pkr(Number(e.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-hair bg-card2 px-3.5 py-2 text-right">
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-faint2">{label}</div>
      <div className="mt-0.5 font-mono text-[16px] font-semibold text-ink">{value}</div>
    </div>
  );
}
