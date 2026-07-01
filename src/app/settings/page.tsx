import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";

export const dynamic = "force-dynamic";

/**
 * Settings hub — the one place the owner customises master data. Each internal
 * section (Stores, Parties, Items, Reference series, Users) is its own page
 * under /settings; Banks and Expense categories are cross-linked to their
 * existing pages rather than rebuilt here.
 */
export default async function SettingsPage() {
  const ctx = await getActiveContext();
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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Master data for <span className="font-medium">{ctx.entityName}</span>.
          Add, rename and fine-tune the stores, parties, products and numbering
          your book uses.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <HubCard
          href="/settings/stores"
          testId="hub-stores"
          title="Stores"
          desc="Add stores; rename an existing one (no delete — FK-safe)."
          count={storeCount}
          countLabel="stores"
        />
        <HubCard
          href="/settings/parties"
          testId="hub-parties"
          title="Parties & suppliers"
          desc="Customers and suppliers — add, edit, opening balances, NTN."
          count={partyCount}
          countLabel="parties"
        />
        <HubCard
          href="/settings/items"
          testId="hub-items"
          title="Items / products"
          desc="Fish fillet & prawn products; rates and glazing are owner-confirmable."
          count={itemCount}
          countLabel="items"
        />
        <HubCard
          href="/settings/references"
          testId="hub-references"
          title="Reference series"
          desc="Per-book/region manual invoice numbering with a live preview."
          count={seriesCount}
          countLabel="series"
        />
        {isAdmin ? (
          <HubCard
            href="/settings/users"
            testId="hub-users"
            title="Users"
            desc="Staff logins, roles, book access and region scope (admin only)."
            count={userCount}
            countLabel="users"
          />
        ) : (
          <div
            data-testid="hub-users-locked"
            className="rounded-lg border border-slate-200 bg-white p-4 opacity-70 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Users</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                admin only
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Only an admin may manage staff logins and roles.
            </p>
          </div>
        )}
      </div>

      {/* Cross-links to existing hubs — not rebuilt here. */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Also managed elsewhere
        </h2>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          These live on their own pages so this stays the single hub for
          everything you can customise.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/banks"
            data-testid="hub-link-banks"
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-cyan-700 hover:bg-slate-50 dark:border-slate-700 dark:text-cyan-400 dark:hover:bg-slate-800"
          >
            Bank accounts →
          </Link>
          <Link
            href="/expenses"
            data-testid="hub-link-expenses"
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-cyan-700 hover:bg-slate-50 dark:border-slate-700 dark:text-cyan-400 dark:hover:bg-slate-800"
          >
            Expense categories →
          </Link>
          <Link
            href="/settings/password"
            data-testid="hub-link-password"
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-cyan-700 hover:bg-slate-50 dark:border-slate-700 dark:text-cyan-400 dark:hover:bg-slate-800"
          >
            Change my password →
          </Link>
        </div>
      </div>
    </div>
  );
}

function HubCard({
  href,
  testId,
  title,
  desc,
  count,
  countLabel,
}: {
  href: string;
  testId: string;
  title: string;
  desc: string;
  count: number;
  countLabel: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="block rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-cyan-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-700 dark:hover:bg-slate-800"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-medium">{title}</h2>
        <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
          {count} {countLabel}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{desc}</p>
    </Link>
  );
}
