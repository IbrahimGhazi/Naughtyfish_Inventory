import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage, ADMIN_ROLES, getAllRoles, BUILDER_PAGES, PAGE_LABELS } from "@/lib/roles";
import { BackLink, PageHeader } from "@/components/ui";
import RolesManager from "./RolesManager";

export const dynamic = "force-dynamic";

/** Access control hub — custom roles with per-tab view/edit permissions. */
export default async function RolesSettingsPage() {
  const ctx = await getActiveContext();
  requirePage(ctx, "settings");
  if (!ADMIN_ROLES.includes(ctx.user.role)) redirect("/settings");

  const [roles, grouped] = await Promise.all([
    getAllRoles(),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
  ]);
  const userCounts: Record<string, number> = {};
  for (const g of grouped) userCounts[g.role] = g._count._all;

  return (
    <div className="mx-auto max-w-[900px] animate-rise">
      <BackLink href="/settings">Back to settings</BackLink>
      <PageHeader
        eyebrow="Access control"
        title="Roles & access"
        subtitle="Create roles and choose, tab by tab, whether they can view or edit each part of the app."
      />
      <RolesManager
        roles={roles}
        userCounts={userCounts}
        pages={BUILDER_PAGES}
        pageLabels={PAGE_LABELS}
      />
    </div>
  );
}
