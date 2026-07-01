import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { pkr, dateShort } from "@/lib/format";
import { Card, Chip, PageHeader, Th } from "@/components/ui";
import { AddCategoryForm, AddEntryForm, type FormCategory } from "./ExpenseControls";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const ctx = await getActiveContext();
  const scope = entityScope(ctx);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [categories, entries, monthAgg, byCategory] = await Promise.all([
    prisma.expenseCategory.findMany({ where: scope, orderBy: { name: "asc" } }),
    prisma.expenseEntry.findMany({
      where: scope,
      include: { category: true },
      orderBy: { date: "desc" },
      take: 30,
    }),
    // This-month total (entries dated within the current calendar month).
    prisma.expenseEntry.aggregate({
      where: { ...scope, date: { gte: monthStart } },
      _sum: { amount: true },
    }),
    // Per-category totals feed the category chips.
    prisma.expenseEntry.groupBy({
      by: ["categoryId"],
      where: scope,
      _sum: { amount: true },
    }),
  ]);

  const monthTotal = Number(monthAgg._sum.amount ?? 0);
  const totalByCategory = new Map(
    byCategory.map((g) => [g.categoryId, Number(g._sum.amount ?? 0)]),
  );

  const formCategories: FormCategory[] = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="animate-rise space-y-5">
      <PageHeader
        eyebrow="Money"
        title="Expenses"
        action={
          <div className="text-right" data-testid="exp-month-total">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint2">
              This month
            </div>
            <div className="mt-0.5 font-mono text-[22px] font-semibold text-ink">
              {pkr(monthTotal)}
            </div>
          </div>
        }
      />

      {/* Category chips (with running totals) + add-category. */}
      <div className="space-y-3">
        {categories.length === 0 ? (
          <p className="text-sm text-faint">No categories yet — add one below.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <span
                key={c.id}
                data-testid={`exp-cat-${c.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-hair bg-card px-3 py-1.5 text-[12.5px] font-semibold text-text"
              >
                {c.name}
                <span className="font-mono text-[11px] text-gold">
                  {pkr(totalByCategory.get(c.id) ?? 0)}
                </span>
                {c.isOwnerAdded && <span className="text-[11px] text-faint">·added</span>}
              </span>
            ))}
          </div>
        )}
        <AddCategoryForm />
      </div>

      {/* Add-entry row. */}
      <Card className="p-[18px]">
        <AddEntryForm categories={formCategories} />
      </Card>

      {/* Recent entries. */}
      {entries.length === 0 ? (
        <p className="text-sm text-faint">No expense entries yet.</p>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th className="w-[110px]">Date</Th>
                  <Th className="w-[160px]">Category</Th>
                  <Th>Note</Th>
                  <Th align="right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-row hover:bg-card2">
                    <td className="px-3.5 py-3 font-mono text-[12.5px] text-muted">
                      {dateShort(e.date)}
                    </td>
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
  );
}
