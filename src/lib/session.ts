import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { SESSION_COOKIE, verifySession } from "./auth";
import { resolvePerms, type PermLevel } from "./roles";

/**
 * Real session (id/password + stateless signed cookie — see src/lib/auth.ts).
 * getActiveContext() still returns the SAME ActiveContext shape as the old stub,
 * so every existing page/action that scopes with entityScope(ctx) keeps working
 * — swapping the stub for real auth changed *who* the user is, not *how* access
 * is enforced.
 */
export interface ActiveContext {
  user: {
    id: string;
    name: string;
    role: string;
    entityAccess: string; // cstar | nf | both
    regionScope: string; // north | south | all
    storeIds: string[]; // empty = all stores in scope
    /** Resolved page permissions (pageKey -> none|view|edit) for this role. */
    perms: Record<string, PermLevel>;
  };
  /** The book the user is currently looking at. */
  entityId: string;
  entityName: string;
}

/**
 * Which book NAMES the user may access. Plan §4.7: "NF access = superset" —
 * a SeaStar-only grant sees SeaStar; an "nf"/"both" grant sees both books.
 */
export function allowedBookNames(entityAccess: string): string[] {
  if (entityAccess === "nf" || entityAccess === "both") return ["SeaStar", "NF"];
  return ["SeaStar"];
}

/**
 * Read + verify the cookie, load the user, resolve the active book by name.
 * Returns null when logged out (no/invalid cookie, or the user no longer exists).
 */
export async function getOptionalContext(): Promise<ActiveContext | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const payload = verifySession(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { storeScopes: true },
  });
  if (!user) return null;

  const allowed = allowedBookNames(user.entityAccess);

  // Resolve the active book from the token; if it's not allowed (e.g. a revoked
  // grant, or a stale cookie), fall back to the first allowed book.
  const activeName = allowed.includes(payload.entityName)
    ? payload.entityName
    : allowed[0];

  const entity = await prisma.entity.findFirst({ where: { name: activeName } });
  if (!entity) return null;

  const perms = await resolvePerms(user.role);

  return {
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      entityAccess: user.entityAccess,
      regionScope: user.regionScope,
      storeIds: user.storeScopes.map((s) => s.storeId),
      perms,
    },
    entityId: entity.id,
    entityName: entity.name,
  };
}

/** Same as getOptionalContext but redirects to /login when logged out. */
export async function getActiveContext(): Promise<ActiveContext> {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");
  return ctx;
}
