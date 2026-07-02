import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { pkr } from "@/lib/format";
import { Card, PageHeader } from "@/components/ui";
import { BalanceEditor, AddBankForm } from "./BankControls";

export const dynamic = "force-dynamic";

/** Two-letter initials from a bank name. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function BanksPage() {
  const ctx = await getActiveContext();
  requirePage(ctx, "banks");
  const scope = entityScope(ctx);

  const banks = await prisma.bankAccount.findMany({
    where: scope,
    orderBy: { bankName: "asc" },
  });

  const total = banks.reduce((s, b) => s + Number(b.estimatedBalance), 0);

  return (
    <div className="animate-rise space-y-5">
      <PageHeader
        eyebrow="Money"
        title="Bank accounts"
        action={
          <div className="text-right">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint2">
              Total est. balance
            </div>
            <div className="mt-0.5 font-mono text-[22px] font-semibold text-ink">
              {pkr(total)}
            </div>
          </div>
        }
      />

      {/* Manual-balance info banner. */}
      <div
        className="flex items-center gap-2.5 rounded-xl border border-hair bg-card2 px-3.5 py-3 text-[12.5px] text-muted"
      >
        Estimated balances are a{" "}
        <strong className="font-semibold text-text">manual number the owner updates</strong> — never
        auto-decremented by payments or cheques. Click a balance to correct it.
      </div>

      {banks.length === 0 ? (
        <p className="text-sm text-faint">No bank accounts yet. Add one below.</p>
      ) : (
        <div className="space-y-3">
          {banks.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3.5 rounded-xl border border-hair bg-card p-4"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] font-serif text-[15px] font-semibold"
                style={{ background: "var(--side-bg)", color: "var(--side-fg)" }}
              >
                {initials(b.bankName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-text">{b.bankName}</div>
                <div className="text-[12px] text-faint">{b.accountName}</div>
              </div>
              <BalanceEditor id={b.id} balance={Number(b.estimatedBalance)} />
            </div>
          ))}
        </div>
      )}

      <Card className="p-[18px]">
        <h2 className="mb-3 font-serif text-[17px] font-semibold text-ink">Add account</h2>
        <AddBankForm />
      </Card>
    </div>
  );
}
