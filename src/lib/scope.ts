import { prisma } from "./prisma";
import type { ActiveContext } from "./session";

/**
 * Mandatory server-side scope filter (plan §10). Every query that reads
 * entity-scoped data MUST spread `entityScope(ctx)` into its `where`, so a
 * C-Star-only user can never see NF rows. This is the isolation guarantee —
 * UI hiding is not enough. (Full Postgres RLS is a later hardening step.)
 */
export function entityScope(ctx: ActiveContext): { entityId: string } {
  return { entityId: ctx.entityId };
}

/** Which entity ids a user is allowed to access at all (defense in depth). */
export async function allowedEntityIds(ctx: ActiveContext): Promise<string[]> {
  if (ctx.user.entityAccess === "both") {
    const all = await prisma.entity.findMany({ select: { id: true } });
    return all.map((e) => e.id);
  }
  const name = ctx.user.entityAccess === "nf" ? "NF" : "C-Star";
  const e = await prisma.entity.findFirst({ where: { name }, select: { id: true } });
  return e ? [e.id] : [];
}

/** Throw if the active entity is outside the user's grant. */
export async function assertEntityAccess(ctx: ActiveContext): Promise<void> {
  const allowed = await allowedEntityIds(ctx);
  if (!allowed.includes(ctx.entityId)) {
    throw new Error("Forbidden: user lacks access to this book.");
  }
}

/**
 * Store-level scope for store-keeper / north-employee roles. Returns a Prisma
 * `where` fragment for Store queries. Admin/accountant → no restriction.
 */
export function storeScope(ctx: ActiveContext): Record<string, unknown> {
  const where: Record<string, unknown> = { entityId: ctx.entityId };
  if (ctx.user.storeIds.length > 0) {
    where.id = { in: ctx.user.storeIds };
  }
  if (ctx.user.regionScope === "north" || ctx.user.regionScope === "south") {
    where.region = ctx.user.regionScope;
  }
  return where;
}
