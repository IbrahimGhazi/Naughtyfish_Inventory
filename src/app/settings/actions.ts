"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { assertRole, ADMIN_ROLES } from "@/lib/roles";
import { entityScope, assertEntityAccess } from "@/lib/scope";
import {
  STORE_OWNERSHIP,
  PARTY_TYPES,
  PARTY_SUBTYPES,
  CHANNELS,
  ITEM_CATEGORIES,
  ROLES,
  ENTITY_ACCESS,
  REGION_SCOPES,
} from "@/lib/enums";
import { revalidatePath } from "next/cache";

/**
 * Settings hub server actions — CREATE + EDIT (and safe soft-deactivate where a
 * hard delete would break foreign keys) for the master data the owner
 * customises. Every action re-derives the ActiveContext server-side, asserts the
 * user may write to the active book, validates enum-like values against
 * src/lib/enums.ts, and revalidates the affected routes. Nothing here trusts the
 * client for entityId — it always comes from ctx.
 */

/** Guard: only admin (or the hidden platform owner) may manage users. */
async function assertAdmin() {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  if (ctx.user.role !== "admin" && ctx.user.role !== "platform_admin") {
    throw new Error("Only an admin may manage users.");
  }
  return ctx;
}

/* ------------------------------------------------------------------ Stores */

const StoreCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  city: z.string().trim().max(80).optional(),
  region: z.enum(["north", "south"]).optional(),
  ownershipType: z.enum(STORE_OWNERSHIP),
});

export async function createStore(input: z.infer<typeof StoreCreateSchema>) {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  assertRole(ctx, ADMIN_ROLES);
  const parsed = StoreCreateSchema.parse(input);

  await prisma.store.create({
    data: {
      name: parsed.name,
      city: parsed.city || null,
      region: parsed.region || null,
      ownershipType: parsed.ownershipType,
      entityId: ctx.entityId,
    },
  });

  revalidatePath("/settings/stores");
  revalidatePath("/settings");
}

const StoreUpdateSchema = StoreCreateSchema.extend({
  id: z.string().min(1),
});

/**
 * Rename / edit a store. No hard delete is offered (stores are referenced by
 * invoices, inventory, stock movements and shipments) — the owner explicitly
 * wants to be able to rename a store instead.
 */
export async function updateStore(input: z.infer<typeof StoreUpdateSchema>) {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  assertRole(ctx, ADMIN_ROLES);
  const parsed = StoreUpdateSchema.parse(input);

  // Scope the row to the active book before touching it.
  const existing = await prisma.store.findFirst({
    where: { id: parsed.id, ...entityScope(ctx) },
  });
  if (!existing) throw new Error("Store not found in this book.");

  await prisma.store.update({
    where: { id: existing.id },
    data: {
      name: parsed.name,
      city: parsed.city || null,
      region: parsed.region || null,
      ownershipType: parsed.ownershipType,
    },
  });

  revalidatePath("/settings/stores");
  revalidatePath("/settings");
}

/* ----------------------------------------------------------------- Parties */

// ntn is nullable — local buyers are name-only. Empty string → null.
const nullableTrimmed = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const PartyCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  partyType: z.enum(PARTY_TYPES),
  subType: z.enum(PARTY_SUBTYPES).optional().nullable(),
  channel: z.enum(CHANNELS).optional().nullable(),
  address: nullableTrimmed,
  ntn: nullableTrimmed,
  openingBalance: z.coerce.number().default(0),
});

/** Normalise subType: only customers carry corporate|local. */
function normalisePartyFields(p: {
  partyType: string;
  subType?: string | null;
  channel?: string | null;
}) {
  const subType = p.partyType === "customer" ? p.subType ?? null : null;
  const channel = p.channel ?? null;
  return { subType, channel };
}

export async function createParty(input: z.input<typeof PartyCreateSchema>) {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  assertRole(ctx, ADMIN_ROLES);
  const parsed = PartyCreateSchema.parse(input);
  const { subType, channel } = normalisePartyFields(parsed);

  await prisma.party.create({
    data: {
      name: parsed.name,
      partyType: parsed.partyType,
      subType,
      channel,
      address: parsed.address,
      ntn: parsed.ntn,
      openingBalance: parsed.openingBalance,
      entityId: ctx.entityId,
    },
  });

  revalidatePath("/settings/parties");
  revalidatePath("/parties");
  revalidatePath("/settings");
}

const PartyUpdateSchema = PartyCreateSchema.extend({ id: z.string().min(1) });

export async function updateParty(input: z.input<typeof PartyUpdateSchema>) {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  assertRole(ctx, ADMIN_ROLES);
  const parsed = PartyUpdateSchema.parse(input);

  const existing = await prisma.party.findFirst({
    where: { id: parsed.id, ...entityScope(ctx) },
  });
  if (!existing) throw new Error("Party not found in this book.");

  const { subType, channel } = normalisePartyFields(parsed);

  await prisma.party.update({
    where: { id: existing.id },
    data: {
      name: parsed.name,
      partyType: parsed.partyType,
      subType,
      channel,
      address: parsed.address,
      ntn: parsed.ntn,
      openingBalance: parsed.openingBalance,
    },
  });

  revalidatePath("/settings/parties");
  revalidatePath("/parties");
  revalidatePath(`/parties/${existing.id}`);
  revalidatePath("/settings");
}

/* ------------------------------------------------------------------- Items */

const ItemCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.enum(ITEM_CATEGORIES),
  cartonWeightKg: z.coerce.number().positive(),
  packetsPerCarton: z.coerce.number().int().positive(),
  isPrawn: z.coerce.boolean(),
  fixedRate: z.coerce.number().min(0).optional().nullable(),
  defaultGlazingPct: z.coerce.number().min(0).max(99).optional().nullable(),
  active: z.coerce.boolean().default(true),
});

export async function createItem(input: z.infer<typeof ItemCreateSchema>) {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  assertRole(ctx, ADMIN_ROLES);
  const parsed = ItemCreateSchema.parse(input);

  await prisma.item.create({
    data: {
      name: parsed.name,
      category: parsed.category,
      cartonWeightKg: parsed.cartonWeightKg,
      packetsPerCarton: parsed.packetsPerCarton,
      isPrawn: parsed.isPrawn,
      fixedRate: parsed.fixedRate ?? null,
      defaultGlazingPct: parsed.defaultGlazingPct ?? null,
      active: parsed.active,
      entityId: ctx.entityId,
    },
  });

  revalidatePath("/settings/items");
  revalidatePath("/settings");
}

const ItemUpdateSchema = ItemCreateSchema.extend({ id: z.string().min(1) });

export async function updateItem(input: z.infer<typeof ItemUpdateSchema>) {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  assertRole(ctx, ADMIN_ROLES);
  const parsed = ItemUpdateSchema.parse(input);

  const existing = await prisma.item.findFirst({
    where: { id: parsed.id, ...entityScope(ctx) },
  });
  if (!existing) throw new Error("Item not found in this book.");

  await prisma.item.update({
    where: { id: existing.id },
    data: {
      name: parsed.name,
      category: parsed.category,
      cartonWeightKg: parsed.cartonWeightKg,
      packetsPerCarton: parsed.packetsPerCarton,
      isPrawn: parsed.isPrawn,
      fixedRate: parsed.fixedRate ?? null,
      defaultGlazingPct: parsed.defaultGlazingPct ?? null,
      active: parsed.active,
    },
  });

  revalidatePath("/settings/items");
  revalidatePath("/settings");
}

const ItemActiveSchema = z.object({
  id: z.string().min(1),
  active: z.coerce.boolean(),
});

/**
 * Toggle an item active/inactive. Items are referenced by invoice lines and
 * stock movements, so we deactivate instead of deleting — a deactivated item
 * stays in history but can be hidden from new-invoice pickers.
 */
export async function setItemActive(input: z.infer<typeof ItemActiveSchema>) {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  assertRole(ctx, ADMIN_ROLES);
  const parsed = ItemActiveSchema.parse(input);

  const existing = await prisma.item.findFirst({
    where: { id: parsed.id, ...entityScope(ctx) },
  });
  if (!existing) throw new Error("Item not found in this book.");

  await prisma.item.update({
    where: { id: existing.id },
    data: { active: parsed.active },
  });

  revalidatePath("/settings/items");
  revalidatePath("/settings");
}

/* -------------------------------------------------------- Reference series */

const SeriesCreateSchema = z.object({
  prefix: z.string().trim().min(1).max(12),
  bookRegion: z.string().trim().min(1).max(40),
  currentNumber: z.coerce.number().int().min(0),
  digitWidth: z.coerce.number().int().min(1).max(12),
});

export async function createReferenceSeries(
  input: z.infer<typeof SeriesCreateSchema>,
) {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  assertRole(ctx, ADMIN_ROLES);
  const parsed = SeriesCreateSchema.parse(input);

  // Unique per entity+bookRegion (matches the schema @@unique).
  const dupe = await prisma.referenceSeries.findFirst({
    where: { ...entityScope(ctx), bookRegion: parsed.bookRegion },
  });
  if (dupe) throw new Error("A series already exists for that book/region.");

  await prisma.referenceSeries.create({
    data: {
      prefix: parsed.prefix,
      bookRegion: parsed.bookRegion,
      currentNumber: parsed.currentNumber,
      digitWidth: parsed.digitWidth,
      entityId: ctx.entityId,
    },
  });

  revalidatePath("/settings/references");
  revalidatePath("/settings");
}

const SeriesUpdateSchema = SeriesCreateSchema.extend({ id: z.string().min(1) });

export async function updateReferenceSeries(
  input: z.infer<typeof SeriesUpdateSchema>,
) {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  assertRole(ctx, ADMIN_ROLES);
  const parsed = SeriesUpdateSchema.parse(input);

  const existing = await prisma.referenceSeries.findFirst({
    where: { id: parsed.id, ...entityScope(ctx) },
  });
  if (!existing) throw new Error("Series not found in this book.");

  // If bookRegion changed, ensure the new value is still unique in this book.
  if (parsed.bookRegion !== existing.bookRegion) {
    const dupe = await prisma.referenceSeries.findFirst({
      where: { ...entityScope(ctx), bookRegion: parsed.bookRegion },
    });
    if (dupe) throw new Error("A series already exists for that book/region.");
  }

  await prisma.referenceSeries.update({
    where: { id: existing.id },
    data: {
      prefix: parsed.prefix,
      bookRegion: parsed.bookRegion,
      currentNumber: parsed.currentNumber,
      digitWidth: parsed.digitWidth,
    },
  });

  revalidatePath("/settings/references");
  revalidatePath("/settings");
}

/* ------------------------------------------------------------------- Users */

const UserCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  loginId: z.string().trim().min(1).max(40),
  password: z.string().min(4).max(200),
  role: z.enum(ROLES),
  entityAccess: z.enum(ENTITY_ACCESS),
  regionScope: z.enum(REGION_SCOPES),
});

/** Add a user. Password is hashed with bcrypt (cost 10, matching the seed).
 *  Only the platform owner may mint another platform_admin. */
export async function createUser(input: z.infer<typeof UserCreateSchema>) {
  const admin = await assertAdmin();
  const ctx = await getActiveContext();
  const parsed = UserCreateSchema.parse(input);
  if (parsed.role === "platform_admin" && admin.user.role !== "platform_admin") {
    throw new Error("Only the platform owner may assign that role.");
  }

  const dupe = await prisma.user.findUnique({
    where: { loginId: parsed.loginId },
  });
  if (dupe) throw new Error("That login ID is already taken.");

  const passwordHash = await bcrypt.hash(parsed.password, 10);

  await prisma.user.create({
    data: {
      name: parsed.name,
      loginId: parsed.loginId,
      passwordHash,
      role: parsed.role,
      entityAccess: parsed.entityAccess,
      regionScope: parsed.regionScope,
      entityId: ctx.entityId,
    },
  });

  revalidatePath("/settings/users");
  revalidatePath("/settings");
}

// On edit the password is OPTIONAL — only re-hash when a new one is typed.
const UserUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  loginId: z.string().trim().min(1).max(40),
  password: z.string().max(200).optional(),
  role: z.enum(ROLES),
  entityAccess: z.enum(ENTITY_ACCESS),
  regionScope: z.enum(REGION_SCOPES),
});

export async function updateUser(input: z.infer<typeof UserUpdateSchema>) {
  const admin = await assertAdmin();
  const parsed = UserUpdateSchema.parse(input);

  const existing = await prisma.user.findUnique({ where: { id: parsed.id } });
  if (!existing) throw new Error("User not found.");

  // A client admin can neither touch the platform owner's account nor
  // escalate anyone to platform_admin. (The role is invisible in their UI,
  // but UI hiding is not enforcement.)
  if (admin.user.role !== "platform_admin") {
    if (existing.role === "platform_admin" || parsed.role === "platform_admin") {
      throw new Error("Only the platform owner may manage that account.");
    }
  }

  // loginId is globally unique — block a collision with a *different* user.
  if (parsed.loginId !== existing.loginId) {
    const dupe = await prisma.user.findUnique({
      where: { loginId: parsed.loginId },
    });
    if (dupe) throw new Error("That login ID is already taken.");
  }

  const data: {
    name: string;
    loginId: string;
    role: string;
    entityAccess: string;
    regionScope: string;
    passwordHash?: string;
  } = {
    name: parsed.name,
    loginId: parsed.loginId,
    role: parsed.role,
    entityAccess: parsed.entityAccess,
    regionScope: parsed.regionScope,
  };

  // Only re-hash if a non-empty new password was typed.
  if (parsed.password && parsed.password.trim().length > 0) {
    if (parsed.password.trim().length < 4) {
      throw new Error("Password must be at least 4 characters.");
    }
    data.passwordHash = await bcrypt.hash(parsed.password.trim(), 10);
  }

  await prisma.user.update({ where: { id: existing.id }, data });

  revalidatePath("/settings/users");
  revalidatePath("/settings");
}
