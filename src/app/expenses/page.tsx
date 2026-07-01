import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { pkr, dateShort } from "@/lib/format";
import { AddCategoryForm, AddEntryForm, type FormCategory } from "./ExpenseControls";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const ctx = await getActiveContext();
  const scope = entityScope(ctx);

  const [categories, entries] = await Promise.all([
    prisma.expenseCategory.findMany({ where: scope, orderBy: { name: "asc" } }),
    prisma.expenseEntry.findMany({
      where: scope,
      include: { category: true },
      orderBy: { date: "desc" },
      take: 30,
    }),
  ]);

  // This-month total (entries dated within the current calendar month).
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthAgg = await prisma.expenseEntry.aggregate({
    where: { ...scope, date: { gte: monthStart } },
    _sum: { amount: true },
  });
  const monthTotal = Number(monthAgg._sum.amount ?? 0);

  const formCategories: FormCategory[] = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Expenses</h1>

      {/* (a) Categories — flat, owner-editable list. */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Categories</h2>
        {categories.length === 0 ? (
          <p className="mb-3 text-sm text-slate-400 dark:text-slate-500">No categories yet — add one below.</p>
        ) : (
          <ul className="mb-3 flex flex-wrap gap-2">
            {categories.map((c) => (
              <li
                key={c.id}
                data-testid={`exp-cat-${c.id}`}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {c.name}
                {c.isOwnerAdded && <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">·added</span>}
              </li>
            ))}
          </ul>
        )}
        <AddCategoryForm />
      </section>

      {/* (b) Entries — add form + recent table with a this-month total. */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Entries</h2>
          <span className="text-sm text-slate-500 dark:text-slate-400" data-testid="exp-month-total">
            This month:{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-100">{pkr(monthTotal)}</span>
          </span>
        </div>

        <div className="mb-4">
          <AddEntryForm categories={formCategories} />
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No expense entries yet.</p>
        ) : (
          <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400 dark:bg-slate-800/50 dark:text-slate-500">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Note</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{dateShort(e.date)}</td>
                    <td className="px-3 py-2">{e.category.name}</td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{e.note ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-medium">{pkr(Number(e.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
