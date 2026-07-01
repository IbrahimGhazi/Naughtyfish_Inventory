"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";

const Schema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
  confirmPassword: z.string().min(1),
});

export type PasswordState = { error: string | null; ok: boolean };

/** Self-service password change for the LOGGED-IN user (any role). */
export async function changeOwnPassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const ctx = await getActiveContext();

  const parsed = Schema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form.", ok: false };
  }
  if (parsed.data.newPassword !== parsed.data.confirmPassword) {
    return { error: "New passwords do not match.", ok: false };
  }

  const user = await prisma.user.findUnique({ where: { id: ctx.user.id } });
  if (!user) return { error: "User not found.", ok: false };

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { error: "Current password is incorrect.", ok: false };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  });

  return { error: null, ok: true };
}
