import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { PageHeader, Card, Chip } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * Settings hub — the one place the owner customises master data. Each internal
 * section (Stores, Parties, Items, Reference series, Users) is its own page
 * under /settings; Banks and Expense categories are cross-linked to their
 * existing pages rather than rebuilt here.
 */
export default async function SettingsPage() {
  const ctx = await getActiveContext();
  requirePage(ctx, "settings");
  const scope = entityScope(ctx);
  const isAdmin = ctx.user.role === "admin";

  const [storeCount, partyCount, itemCount, seriesCount, userCount] =
    await Promise.all([
      prisma.store.count({ where: scope }),
      prisma.party.count({ where: scope }),
      prisma.item.count({ where: scope }),
      prisma.referenceSeries.count({ where: scope }),
      prisma.user.count({ where: scope }),
    ]);

  return (
    <div className="mx-auto max-w-[1000px] animate-rise px-8 pb-14 pt-7">
      <PageHeader
        eyebrow="Admin"
        title="Settings"
        subtitle={
          <>
            Master data for <span className="font-medium text-text">{ctx.entityName}</span>.
            Add, rename and fine-tune the stores, parties, products and numbering
            your book uses.
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <HubCard
          href="/settings/stores"
          testId="hub-stores"
          title="Stores"
          desc="Add stores; rename an existing one (no delete — FK-safe)."
          count={storeCount}
        />
        <HubCard
          href="/settings/parties"
          testId="hub-parties"
          title="Parties & suppliers"
          desc="Customers and suppliers — add, edit, opening balances, NTN."
          count={partyCount}
        />
        <HubCard
          href="/settings/items"
          testId="hub-items"
          title="Items / products"
          desc="Fish fillet & prawn products; rates and glazing are owner-confirmable."
          count={itemCount}
        />
        <HubCard
          href="/settings/references"
          testId="hub-references"
          title="Reference series"
          desc="Per-book/region manual invoice numbering with a live preview."
          count={seriesCount}
        />
        {isAdmin ? (
          <HubCard
            href="/settings/users"
            testId="hub-users"
            title="Users"
            desc="Staff logins, roles, book access and region scope (admin only)."
            count={userCount}
          />
        ) : (
          <div
            data-testid="hub-users-locked"
            className="rounded-xl border border-hair bg-card p-4 opacity-70"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-serif text-[17px] font-semibold text-ink">Users</h2>
              <Chip tone="neutral">admin only</Chip>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
              Only an admin may manage staff logins and roles.
            </p>
          </div>
        )}
      </div>

      {/* Cross-links to existing hubs — not rebuilt here. */}
      <Card className="mt-4 p-[18px]">
        <h2 className="font-serif text-[17px] font-semibold text-ink">
          Also managed elsewhere
        </h2>
        <p className="mb-3 mt-0.5 text-xs text-muted">
          These live on their own pages so this stays the single hub for
          everything you can customise.
        </p>
        <div className="flex flex-wrap gap-2">
          <CrossLink href="/banks" testId="hub-link-banks">
            Bank accounts →
          </CrossLink>
          <CrossLink href="/expenses" testId="hub-link-expenses">
            Expense categories →
          </CrossLink>
          <CrossLink href="/settings/password" testId="hub-link-password">
            Change my password →
          </CrossLink>
        </div>
      </Card>
    </div>
  );
}

function HubCard({
  href,
  testId,
  title,
  desc,
  count,
}: {
  href: string;
  testId: string;
  title: string;
  desc: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="block rounded-xl border border-hair bg-card p-4 transition-all hover:border-hair2 hover:bg-card2 hover:shadow-[0_6px_18px_-10px_rgba(22,38,46,.18)]"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-serif text-[17px] font-semibold text-ink">{title}</h2>
        <span className="font-mono text-base font-semibold text-accent">{count}</span>
      </div>
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{desc}</p>
    </Link>
  );
}

function CrossLink({
  href,
  testId,
  children,
}: {
  href: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="rounded-lg border border-hair bg-card px-3 py-1.5 text-sm font-semibold text-accent transition-colors hover:bg-card2"
    >
      {children}
    </Link>
  );
}
