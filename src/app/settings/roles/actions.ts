"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import {
  assertRole,
  ADMIN_ROLES,
  BUILDER_PAGES,
  BUILTIN_ROLES,
  type PermLevel,
} from "@/lib/roles";
import { revalidatePath } from "next/cache";

const LEVELS = ["none", "view", "edit"] as const;
const PermsSchema = z.record(z.string(), z.enum(LEVELS));

/** Keep only known builder pages, drop "none" (absent = none). */
function sanitizePerms(input: unknown): Record<string, PermLevel> {
  const parsed = PermsSchema.safeParse(input);
  const raw = parsed.success ? parsed.data : {};
  const out: Record<string, PermLevel> = {};
  for (const page of BUILDER_PAGES) {
    const lvl = raw[page];
    if (lvl === "view" || lvl === "edit") out[page] = lvl;
  }
  return out;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "role"
  );
}

export async function createRole(name: string, perms: unknown) {
  const ctx = await getActiveContext();
  assertRole(ctx, ADMIN_ROLES);

  const clean = name.trim();
  if (!clean) throw new Error("Role name is required.");

  let key = slugify(clean);
  if (BUILTIN_ROLES[key] || key === "platform_admin") key = `${key}_custom`;
  if (await prisma.role.findUnique({ where: { key } })) {
    key = `${key}_${Date.now().toString(36)}`;
  }

  await prisma.role.create({
    data: { key, name: clean, permissions: JSON.stringify(sanitizePerms(perms)), isSystem: false },
  });
  revalidatePath("/settings/roles");
}

export async function saveRolePermissions(key: string, name: string, perms: unknown) {
  const ctx = await getActiveContext();
  assertRole(ctx, ADMIN_ROLES);
  if (key === "platform_admin") throw new Error("The platform owner role can't be edited here.");

  const cleanPerms = sanitizePerms(perms);
  // Self-lockout guard: you can't remove your own Settings-edit access.
  if (key === ctx.user.role && cleanPerms.settings !== "edit") {
    throw new Error("You can't remove your own Settings access — you'd lock yourself out.");
  }

  const isBuiltin = !!BUILTIN_ROLES[key];
  const permissions = JSON.stringify(cleanPerms);
  await prisma.role.upsert({
    where: { key },
    create: {
      key,
      name: name.trim() || BUILTIN_ROLES[key]?.name || key,
      permissions,
      isSystem: isBuiltin,
    },
    update: { name: name.trim() || undefined, permissions },
  });

  revalidatePath("/settings/roles");
  revalidatePath("/", "layout"); // perms drive the sidebar app-wide
}

export async function deleteRole(key: string) {
  const ctx = await getActiveContext();
  assertRole(ctx, ADMIN_ROLES);
  if (BUILTIN_ROLES[key]) throw new Error("Built-in roles can't be deleted.");

  const inUse = await prisma.user.count({ where: { role: key } });
  if (inUse > 0) {
    throw new Error(`${inUse} user(s) still have this role — reassign them first.`);
  }

  await prisma.role.delete({ where: { key } });
  revalidatePath("/settings/roles");
}
