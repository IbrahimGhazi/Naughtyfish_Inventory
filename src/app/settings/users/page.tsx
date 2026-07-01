import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import BackLink from "../BackLink";
import { Card } from "../ui";
import { AddUserForm, UserList, type UserRow } from "./UserControls";

export const dynamic = "force-dynamic";

export default async function UsersSettingsPage() {
  const ctx = await getActiveContext();

  // Guard: only admins may manage staff logins. Non-admins bounce to the hub.
  if (ctx.user.role !== "admin") {
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

  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    loginId: u.loginId,
    role: u.role,
    entityAccess: u.entityAccess,
    regionScope: u.regionScope,
  }));

  return (
    <div className="space-y-6">
      <BackLink />
      <div>
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Staff logins, roles and access for{" "}
          <span className="font-medium">{ctx.entityName}</span>. Passwords are
          hashed and never shown — leave the field blank when editing to keep the
          current one.
        </p>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Existing users
        </h2>
        <UserList users={rows} />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Add user
        </h2>
        <AddUserForm />
      </Card>
    </div>
  );
}
