import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { pkr } from "@/lib/format";
import { BalanceEditor, AddBankForm } from "./BankControls";

export const dynamic = "force-dynamic";

export default async function BanksPage() {
  const ctx = await getActiveContext();
  const scope = entityScope(ctx);

  const banks = await prisma.bankAccount.findMany({
    where: scope,
    orderBy: { bankName: "asc" },
  });

  const total = banks.reduce((s, b) => s + Number(b.estimatedBalance), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Bank accounts</h1>
        <div className="text-right">
          <div className="text-xs uppercase text-slate-400 dark:text-slate-500">Total est. balance</div>
          <div className="text-lg font-semibold">{pkr(total)}</div>
        </div>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Estimated balances are a <strong>manual number the owner updates</strong> — they are never
        auto-decremented from payments or cheques.
      </p>

      {banks.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">No bank accounts yet. Add one below.</p>
      ) : (
        <ul className="space-y-3">
          {banks.map((b) => (
            <li key={b.id} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{b.bankName}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">{b.accountName}</div>
                </div>
                <BalanceEditor id={b.id} balance={Number(b.estimatedBalance)} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Add account</h2>
        <AddBankForm />
      </section>
    </div>
  );
}
