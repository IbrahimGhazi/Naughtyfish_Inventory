import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage, ADMIN_ROLES, getAllRoles } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { getCopy } from "@/lib/config";
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
  const t = await getCopy();
  const scope = entityScope(ctx);
  const isAdmin = ADMIN_ROLES.includes(ctx.user.role);

  const [storeCount, partyCount, itemCount, seriesCount, userCount] =
    await Promise.all([
      prisma.store.count({ where: scope }),
      prisma.party.count({ where: scope }),
      prisma.item.count({ where: scope }),
      prisma.referenceSeries.count({ where: scope }),
      prisma.user.count({ where: scope }),
    ]);
  const roleCount = isAdmin ? (await getAllRoles()).length : 0;

  return (
    <div className="mx-auto max-w-[1000px] animate-rise">
      <PageHeader
        eyebrow={t("settings.hub.eyebrow")}
        title={t("settings.hub.title")}
        subtitle={
          <>
            {t("settings.hub.subtitle.prefix")}
            <span className="font-medium text-text">{ctx.entityName}</span>
            {t("settings.hub.subtitle.suffix")}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <HubCard
          href="/settings/stores"
          testId="hub-stores"
          title={t("settings.hub.stores.title")}
          desc={t("settings.hub.stores.desc")}
          count={storeCount}
        />
        <HubCard
          href="/settings/parties"
          testId="hub-parties"
          title={t("settings.hub.parties.title")}
          desc={t("settings.hub.parties.desc")}
          count={partyCount}
        />
        <HubCard
          href="/settings/items"
          testId="hub-items"
          title={t("settings.hub.items.title")}
          desc={t("settings.hub.items.desc")}
          count={itemCount}
        />
        <HubCard
          href="/settings/references"
          testId="hub-references"
          title={t("settings.hub.references.title")}
          desc={t("settings.hub.references.desc")}
          count={seriesCount}
        />
        {isAdmin ? (
          <>
            <HubCard
              href="/settings/users"
              testId="hub-users"
              title={t("settings.hub.users.title")}
              desc={t("settings.hub.users.desc")}
              count={userCount}
            />
            <HubCard
              href="/settings/roles"
              testId="hub-roles"
              title="Roles & access"
              desc="Custom roles + per-tab view/edit permissions"
              count={roleCount}
            />
          </>
        ) : (
          <div
            data-testid="hub-users-locked"
            className="rounded-xl border border-hair bg-card p-4 opacity-70"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-serif text-[17px] font-semibold text-ink">
                {t("settings.hub.users.title")}
              </h2>
              <Chip tone="neutral">{t("settings.hub.users.lockedChip")}</Chip>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
              {t("settings.hub.users.lockedDesc")}
            </p>
          </div>
        )}
      </div>

      {/* Cross-links to existing hubs — not rebuilt here. */}
      <Card className="mt-4 p-[18px]">
        <h2 className="font-serif text-[17px] font-semibold text-ink">
          {t("settings.hub.elsewhere.title")}
        </h2>
        <p className="mb-3 mt-0.5 text-xs text-muted">
          {t("settings.hub.elsewhere.desc")}
        </p>
        <div className="flex flex-wrap gap-2">
          <CrossLink href="/banks" testId="hub-link-banks">
            {t("settings.hub.link.banks")}
          </CrossLink>
          <CrossLink href="/expenses" testId="hub-link-expenses">
            {t("settings.hub.link.expenses")}
          </CrossLink>
          <CrossLink href="/settings/password" testId="hub-link-password">
            {t("settings.hub.link.password")}
          </CrossLink>
        </div>
      </Card>

      {/* Danger zone — irreversible book-wide data reset (admin only). */}
      {isAdmin && (
        <Card className="mt-4 p-[18px]" style={{ borderColor: "var(--neg)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-neg">
                {t("settings.hub.danger.title")}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {t("settings.hub.danger.desc")}
              </p>
            </div>
            <Link
              href="/settings/reset"
              data-testid="hub-link-reset"
              className="shrink-0 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors"
              style={{ borderColor: "var(--neg)", color: "var(--neg)" }}
            >
              {t("settings.hub.danger.link")}
            </Link>
          </div>
        </Card>
      )}
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
