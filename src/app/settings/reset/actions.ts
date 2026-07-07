"use server";

import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { assertEntityAccess } from "@/lib/scope";
import { ADMIN_ROLES } from "@/lib/roles";
import { deleteEntityBusinessData, resetTotal, type ResetSummary } from "@/lib/reset";
import { revalidatePath } from "next/cache";

export type ResetState = {
  error: string | null;
  ok: boolean;
  total?: number;
  summary?: ResetSummary;
};

/**
 * DANGER ZONE — wipe every business record in the ACTIVE book. Admin-only, and
 * gated behind typing the exact book name so it can't fire by accident. Login
 * accounts, roles, config and the book itself are preserved (see lib/reset.ts).
 */
export async function resetAllData(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  if (!ADMIN_ROLES.includes(ctx.user.role)) {
    return { error: "Only an admin may reset the book's data.", ok: false };
  }

  const typed = String(formData.get("confirmName") ?? "").trim();
  if (typed !== ctx.entityName) {
    return {
      error: `Type the book name exactly (“${ctx.entityName}”) to confirm.`,
      ok: false,
    };
  }

  const summary = await prisma.$transaction((tx) =>
    deleteEntityBusinessData(tx, ctx.entityId),
  );

  // Every list/dashboard reads this book — refresh the whole tree.
  revalidatePath("/", "layout");

  return { error: null, ok: true, total: resetTotal(summary), summary };
}
