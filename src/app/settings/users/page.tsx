import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import BackLink from "../BackLink";
import { Card } from "../ui";
import { PageHeader } from "@/components/ui";
import { AddUserForm, UserList, type UserRow } from "./UserControls";

export const dynamic = "force-dynamic";

export default async function UsersSettingsPage() {
  const ctx = await getActiveContext();
  requirePage(ctx, "settings");

  // Guard: only admins may manage staff logins. Non-admins bounce to the hub.
  const isPlatform = ctx.user.role === "platform_admin";
  if (ctx.user.role !== "admin" && !isPlatform) {
    redirect("/settings");
  }

  // NOTE: passwordHash is intentionally NOT selected — hashes are never rendered.
  const users = await prisma.user.findMany({
    where: entityScope(ctx),
    select: {
      id: true,
      name: true,
      loginId: true,
      role: true,
      entityAccess: true,
      regionScope: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  // The platform owner's account is invisible to client admins — it's the
  // white-label operator's login, not part of the customer's staff.
  const rows: UserRow[] = users
    .filter((u) => isPlatform || u.role !== "platform_admin")
    .map((u) => ({
      id: u.id,
      name: u.name,
      loginId: u.loginId,
      role: u.role,
      entityAccess: u.entityAccess,
      regionScope: u.regionScope,
    }));

  return (
    <div className="mx-auto max-w-[1000px] animate-rise px-8 pb-14 pt-7">
      <BackLink />
      <PageHeader
        eyebrow="Admin"
        title="Users"
        subtitle={
          <>
            Staff logins, roles and access for{" "}
            <span className="font-medium text-text">{ctx.entityName}</span>. Passwords are
            hashed and never shown — leave the field blank when editing to keep the
            current one.
          </>
        }
      />

      <div className="space-y-4">
        <Card>
          <h2 className="mb-3 font-serif text-[17px] font-semibold text-ink">
            Existing users
          </h2>
          <UserList users={rows} />
        </Card>

        <Card>
          <h2 className="mb-3 font-serif text-[17px] font-semibold text-ink">
            Add user
          </h2>
          <AddUserForm />
        </Card>
      </div>
    </div>
  );
}
