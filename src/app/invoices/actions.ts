"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { assertEntityAccess } from "@/lib/scope";
import { assertCanMutate, OFFICE_ROLES } from "@/lib/roles";
import { computeLine, computeInvoiceTotal, type LineInput } from "@/lib/billing";
import { formatReference } from "@/lib/reference";
import { aggregateByItem, computeStockDelta, round3, type StockLineQty } from "@/lib/inventory";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

/** Prisma transaction client type (what $transaction hands the callback). */
type Tx = Prisma.TransactionClient;

/**
 * Deduct dispatched quantities from a source store at DISPATCH and record an
 * "issue" StockMovement per item (plan §4.6: "stock pehle nikaalte hain").
 * Upserts the StoreInventoryLine if a line doesn't exist yet; stock may go
 * negative (real-world correction, allowed).
 */
async function applyDispatchToStore(
  tx: Tx,
  entityId: string,
  storeId: string,
  invoiceId: string,
  lines: StockLineQty[],
): Promise<void> {
  const byItem = aggregateByItem(lines);
  for (const q of byItem.values()) {
    const existing = await tx.storeInventoryLine.findUnique({
      where: { storeId_itemId: { storeId, itemId: q.itemId } },
    });
    await tx.storeInventoryLine.upsert({
      where: { storeId_itemId: { storeId, itemId: q.itemId } },
      create: {
        storeId,
        itemId: q.itemId,
        cartonCount: -q.cartons,
        packetCount: -q.packets,
        kgPerCarton: existing?.kgPerCarton ?? 0,
        totalKg: -q.kg,
      },
      update: {
        cartonCount: (existing?.cartonCount ?? 0) - q.cartons,
        packetCount: (existing?.packetCount ?? 0) - q.packets,
        totalKg: round3(Number(existing?.totalKg ?? 0) - q.kg),
      },
    });
    await tx.stockMovement.create({
      data: {
        type: "issue",
        cartons: q.cartons,
        packets: q.packets,
        kg: q.kg,
        fromStoreId: storeId,
        itemId: q.itemId,
        invoiceId,
        entityId,
      },
    });
  }
}

/**
 * Apply an invoice EDIT's per-item delta back against the source store. The
 * delta (old − new) flows BACK into the store when positive (owner's "5 kg
 * short" case) and takes MORE out when negative. Records an "adjust" movement.
 */
async function applyEditDeltaToStore(
  tx: Tx,
  entityId: string,
  storeId: string,
  invoiceId: string,
  oldLines: StockLineQty[],
  newLines: StockLineQty[],
): Promise<void> {
  const deltas = computeStockDelta(oldLines, newLines);
  for (const d of deltas) {
    const existing = await tx.storeInventoryLine.findUnique({
      where: { storeId_itemId: { storeId, itemId: d.itemId } },
    });
    // delta positive = stock returns to the store (add); negative = more out.
    await tx.storeInventoryLine.upsert({
      where: { storeId_itemId: { storeId, itemId: d.itemId } },
      create: {
        storeId,
        itemId: d.itemId,
        cartonCount: d.cartons,
        packetCount: d.packets,
        kgPerCarton: existing?.kgPerCarton ?? 0,
        totalKg: d.kg,
      },
      update: {
        cartonCount: (existing?.cartonCount ?? 0) + d.cartons,
        packetCount: (existing?.packetCount ?? 0) + d.packets,
        totalKg: round3(Number(existing?.totalKg ?? 0) + d.kg),
      },
    });
    await tx.stockMovement.create({
      data: {
        type: "adjust",
        cartons: d.cartons,
        packets: d.packets,
        kg: d.kg,
        note: "invoice edit delta",
        fromStoreId: storeId,
        itemId: d.itemId,
        invoiceId,
        entityId,
      },
    });
  }
}

const LineSchema = z.object({
  itemId: z.string().min(1),
  grossWeightKg: z.coerce.number().positive(),
  finalWeightKg: z.coerce.number().positive().optional(),
  glazingPercent: z.coerce.number().min(0).max(99).optional(),
  ratePerKg: z.coerce.number().min(0),
  cartonCount: z.coerce.number().int().min(0).optional(),
  packetCount: z.coerce.number().int().min(0).optional(),
  expectedPacketCount: z.coerce.number().int().min(0).optional(),
});

const InvoiceSchema = z.object({
  partyId: z.string().min(1),
  channel: z.enum(["north", "local"]),
  sourceStoreId: z.string().optional(),
  referenceRegion: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(LineSchema).min(1),
});

export type CreateInvoiceInput = z.infer<typeof InvoiceSchema>;

export async function createInvoice(input: CreateInvoiceInput, clientId?: string) {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  assertCanMutate(ctx, "invoices", [...OFFICE_ROLES, "north_employee", "delivery"]);

  // Idempotent replay of an offline-queued invoice: the client generated the
  // invoice id, so if it already exists this sync already landed (with its
  // server-assigned number). Return it instead of creating a duplicate + a
  // second stock deduction. (Online callers pass no clientId → unchanged.)
  if (clientId) {
    const existing = await prisma.invoice.findUnique({
      where: { id: clientId },
      select: { id: true, invoiceNumber: true, referenceNumber: true, totalAmount: true },
    });
    if (existing) {
      return {
        id: existing.id,
        invoiceNumber: existing.invoiceNumber,
        referenceNumber: existing.referenceNumber,
        total: Number(existing.totalAmount),
      };
    }
  }

  // Roadmap M3.2: a delivery login's invoice lands as a DRAFT the office
  // reviews before it counts as final. Stock + the immutable delivery record
  // still post immediately — the goods physically left; only the paperwork
  // awaits review (office fixes mistakes via the versioned edit flow).
  const isDeliveryDraft = ctx.user.role === "delivery";

  const parsed = InvoiceSchema.parse(input);

  // Two-book isolation: the party (and source store, if any) must belong to the
  // active book — same guarantee createPayment enforces. Never trust client ids.
  const party = await prisma.party.findFirst({
    where: { id: parsed.partyId, entityId: ctx.entityId },
    select: { id: true },
  });
  if (!party) throw new Error("Party is not in the active book.");
  if (parsed.sourceStoreId) {
    const store = await prisma.store.findFirst({
      where: { id: parsed.sourceStoreId, entityId: ctx.entityId },
      select: { id: true },
    });
    if (!store) throw new Error("Source store is not in the active book.");
  }

  // Load items (scoped) + per-item/party glazing baselines for the variance alert.
  const itemIds = [...new Set(parsed.lines.map((l) => l.itemId))];
  const items = await prisma.item.findMany({
    where: { id: { in: itemIds }, entityId: ctx.entityId },
  });
  const itemById = new Map(items.map((i) => [i.id, i]));
  if (itemById.size !== itemIds.length) {
    throw new Error("One or more items are not in the active book.");
  }

  const glazingSettings = await prisma.glazingSetting.findMany({
    where: { entityId: ctx.entityId, itemId: { in: itemIds } },
  });
  const expectedByItem = new Map<string, number>();
  for (const gs of glazingSettings) {
    // Prefer a party-specific baseline, else the item-level one.
    const key = gs.itemId;
    const isPartySpecific = gs.partyId === parsed.partyId;
    if (isPartySpecific || !expectedByItem.has(key)) {
      expectedByItem.set(key, Number(gs.expectedGlazingPct));
    }
  }

  // Recompute every line SERVER-SIDE via the shared engine (never trust client).
  const computed = parsed.lines.map((l) => {
    const item = itemById.get(l.itemId)!;
    const li: LineInput = {
      grossWeightKg: l.grossWeightKg,
      ratePerKg: l.ratePerKg,
      channel: parsed.channel,
      finalWeightKg: l.finalWeightKg,
      glazingPercent: l.glazingPercent,
      isPrawn: item.isPrawn,
      cartonCount: l.cartonCount,
      packetCount: l.packetCount,
      expectedPacketCount: l.expectedPacketCount,
      expectedGlazingPercent: expectedByItem.get(l.itemId),
    };
    return { line: computeLine(li), item, raw: l };
  });

  const total = computeInvoiceTotal(computed.map((c) => c.line));

  const result = await prisma.$transaction(async (tx) => {
    // Single global invoice number series (plan §4.2): 100 → 101 → 102 …
    const last = await tx.invoice.findFirst({ orderBy: { invoiceNumber: "desc" } });
    const invoiceNumber = (last?.invoiceNumber ?? 100) + 1;

    // Optional manual reference number from the per-book/region series.
    let referenceNumber: string | null = null;
    if (parsed.referenceRegion) {
      const series = await tx.referenceSeries.findFirst({
        where: { entityId: ctx.entityId, bookRegion: parsed.referenceRegion },
      });
      if (series) {
        const nextNum = series.currentNumber + 1;
        await tx.referenceSeries.update({
          where: { id: series.id },
          data: { currentNumber: nextNum },
        });
        referenceNumber = formatReference(series.prefix, nextNum, series.digitWidth);
      }
    }

    const invoice = await tx.invoice.create({
      data: {
        ...(clientId ? { id: clientId } : {}),
        invoiceNumber,
        referenceNumber,
        channel: parsed.channel,
        status: isDeliveryDraft ? "draft" : "submitted",
        notes: parsed.notes,
        totalAmount: total,
        date: new Date(),
        partyId: parsed.partyId,
        entityId: ctx.entityId,
        sourceStoreId: parsed.sourceStoreId || null,
        createdById: ctx.user.id,
        lineItems: {
          create: computed.map(({ line, item }) => ({
            itemId: item.id,
            grossWeightKg: line.grossWeightKg,
            finalWeightKg: line.channel === "north" ? line.netWeightKg : null,
            glazingPct: line.glazingPercent,
            netWeightKg: line.netWeightKg,
            ratePerKg: line.ratePerKg,
            amount: line.amount,
            cartonCount: line.cartonCount ?? null,
            packetCount: line.packetCount ?? null,
            cartonWeightKg: item.cartonWeightKg,
          })),
        },
      },
    });

    // Immutable dispute-defense delivery record (plan §4.1), snapshotting names.
    await tx.deliveryRecord.create({
      data: {
        channel: parsed.channel,
        totalAmount: total,
        notes: parsed.notes,
        partyId: parsed.partyId,
        storeFromId: parsed.sourceStoreId || null,
        deliveredById: ctx.user.id,
        entityId: ctx.entityId,
        invoiceId: invoice.id,
        lineItems: {
          create: computed.map(({ line, item }) => ({
            itemName: item.name,
            grossWeightKg: line.grossWeightKg,
            finalWeightKg: line.channel === "north" ? line.netWeightKg : null,
            glazingPct: line.glazingPercent,
            netWeightKg: line.netWeightKg,
            ratePerKg: line.ratePerKg,
            amount: line.amount,
            cartonCount: line.cartonCount ?? null,
            packetCount: line.packetCount ?? null,
          })),
        },
      },
    });

    // Dispatch effect: deduct stock from the source store at dispatch time.
    // "stock pehle nikaalte hain, phir deliver karne jaate hain" (plan §4.6).
    if (parsed.sourceStoreId) {
      const stockLines: StockLineQty[] = computed.map(({ line, item, raw }) => ({
        itemId: item.id,
        kg: Number(line.grossWeightKg),
        cartons: raw.cartonCount ?? 0,
        packets: raw.packetCount ?? 0,
      }));
      await applyDispatchToStore(tx, ctx.entityId, parsed.sourceStoreId, invoice.id, stockLines);
    }

    return invoice;
  });

  revalidatePath("/");
  revalidatePath("/invoices");
  revalidatePath("/inventory");
  revalidatePath(`/parties/${parsed.partyId}`);
  return { id: result.id, invoiceNumber: result.invoiceNumber, referenceNumber: result.referenceNumber, total };
}

const UpdateInvoiceSchema = z.object({
  invoiceId: z.string().min(1),
  notes: z.string().optional(),
  lines: z.array(LineSchema).min(1),
});

export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;

/**
 * Edit an existing invoice (the owner's "goods arrived 5kg short" case).
 * The invoice NUMBER and reference number are UNCHANGED; every line is recomputed
 * server-side through the shared billing engine; the prior delivery record is
 * preserved and a NEW versioned DeliveryRecord is appended (append-only dispute
 * defense — existing records are never updated or deleted).
 */
export async function updateInvoice(input: UpdateInvoiceInput) {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  // Edits rewrite amounts + append delivery-record versions — office only.
  assertCanMutate(ctx, "invoices", OFFICE_ROLES);

  const parsed = UpdateInvoiceSchema.parse(input);

  // Load the invoice SCOPED to the active book (channel + party are fixed on edit).
  const invoice = await prisma.invoice.findFirst({
    where: { id: parsed.invoiceId, entityId: ctx.entityId },
    include: {
      deliveryRecords: { orderBy: { version: "desc" }, take: 1 },
      lineItems: true,
    },
  });
  if (!invoice) throw new Error("Invoice not found in this book.");

  // Snapshot the OLD dispatched quantities per line (for the stock-edit delta).
  const oldStockLines: StockLineQty[] = invoice.lineItems.map((li) => ({
    itemId: li.itemId,
    kg: Number(li.grossWeightKg),
    cartons: li.cartonCount ?? 0,
    packets: li.packetCount ?? 0,
  }));

  const channel = invoice.channel as "north" | "local";
  const partyId = invoice.partyId;

  // Load items (scoped) + per-item/party glazing baselines for the variance alert.
  const itemIds = [...new Set(parsed.lines.map((l) => l.itemId))];
  const items = await prisma.item.findMany({
    where: { id: { in: itemIds }, entityId: ctx.entityId },
  });
  const itemById = new Map(items.map((i) => [i.id, i]));
  if (itemById.size !== itemIds.length) {
    throw new Error("One or more items are not in the active book.");
  }

  const glazingSettings = await prisma.glazingSetting.findMany({
    where: { entityId: ctx.entityId, itemId: { in: itemIds } },
  });
  const expectedByItem = new Map<string, number>();
  for (const gs of glazingSettings) {
    const key = gs.itemId;
    const isPartySpecific = gs.partyId === partyId;
    if (isPartySpecific || !expectedByItem.has(key)) {
      expectedByItem.set(key, Number(gs.expectedGlazingPct));
    }
  }

  // Recompute every line SERVER-SIDE via the shared engine (never trust client).
  const computed = parsed.lines.map((l) => {
    const item = itemById.get(l.itemId)!;
    const li: LineInput = {
      grossWeightKg: l.grossWeightKg,
      ratePerKg: l.ratePerKg,
      channel,
      finalWeightKg: l.finalWeightKg,
      glazingPercent: l.glazingPercent,
      isPrawn: item.isPrawn,
      cartonCount: l.cartonCount,
      packetCount: l.packetCount,
      expectedPacketCount: l.expectedPacketCount,
      expectedGlazingPercent: expectedByItem.get(l.itemId),
    };
    return { line: computeLine(li), item, raw: l };
  });

  const total = computeInvoiceTotal(computed.map((c) => c.line));

  await prisma.$transaction(async (tx) => {
    // Replace the invoice line items with the recomputed set.
    await tx.invoiceLineItem.deleteMany({ where: { invoiceId: invoice.id } });

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        // invoiceNumber + referenceNumber UNCHANGED (edits keep the same number).
        // A field-entered DRAFT stays a draft through corrections so it remains
        // in the review queue and approvable (the banner's "Edit … then approve"
        // flow); only already-final invoices transition to "edited".
        status: invoice.status === "draft" ? "draft" : "edited",
        version: invoice.version + 1,
        notes: parsed.notes,
        totalAmount: total,
        lineItems: {
          create: computed.map(({ line, item }) => ({
            itemId: item.id,
            grossWeightKg: line.grossWeightKg,
            finalWeightKg: line.channel === "north" ? line.netWeightKg : null,
            glazingPct: line.glazingPercent,
            netWeightKg: line.netWeightKg,
            ratePerKg: line.ratePerKg,
            amount: line.amount,
            cartonCount: line.cartonCount ?? null,
            packetCount: line.packetCount ?? null,
            cartonWeightKg: item.cartonWeightKg,
          })),
        },
      },
    });

    // Append a NEW versioned delivery record — NEVER touch the existing ones.
    const latest = invoice.deliveryRecords[0];
    await tx.deliveryRecord.create({
      data: {
        channel,
        totalAmount: total,
        notes: parsed.notes,
        version: (latest?.version ?? 0) + 1,
        supersedesId: latest?.id ?? null,
        partyId,
        storeFromId: invoice.sourceStoreId,
        deliveredById: ctx.user.id,
        entityId: ctx.entityId,
        invoiceId: invoice.id,
        lineItems: {
          create: computed.map(({ line, item }) => ({
            itemName: item.name,
            grossWeightKg: line.grossWeightKg,
            finalWeightKg: line.channel === "north" ? line.netWeightKg : null,
            glazingPct: line.glazingPercent,
            netWeightKg: line.netWeightKg,
            ratePerKg: line.ratePerKg,
            amount: line.amount,
            cartonCount: line.cartonCount ?? null,
            packetCount: line.packetCount ?? null,
          })),
        },
      },
    });

    // Stock edit effect: apply the DELTA (old − new) against the source store.
    // A 5 kg-short correction flows 5 kg back into the store (plan §4.6).
    if (invoice.sourceStoreId) {
      const newStockLines: StockLineQty[] = computed.map(({ line, item, raw }) => ({
        itemId: item.id,
        kg: Number(line.grossWeightKg),
        cartons: raw.cartonCount ?? 0,
        packets: raw.packetCount ?? 0,
      }));
      await applyEditDeltaToStore(
        tx,
        ctx.entityId,
        invoice.sourceStoreId,
        invoice.id,
        oldStockLines,
        newStockLines,
      );
    }
  });

  revalidatePath("/");
  revalidatePath("/invoices");
  revalidatePath("/inventory");
  revalidatePath(`/invoices/${invoice.id}`);
  revalidatePath(`/parties/${partyId}`);
  // The delivery portal's "awaiting review" count keys off status === "draft".
  revalidatePath("/delivery");
  return { id: invoice.id, invoiceNumber: invoice.invoiceNumber, referenceNumber: invoice.referenceNumber, total };
}

/* ----------------------- Delivery-draft review flow ----------------------- */

/**
 * Approve a delivery-entered draft: head office reviewed the numbers, the
 * invoice becomes a normal "submitted" one. (To fix figures first, use the
 * regular edit flow, then approve.)
 */
export async function approveInvoice(invoiceId: string) {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  assertCanMutate(ctx, "invoices", OFFICE_ROLES);

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, entityId: ctx.entityId },
    select: { id: true, status: true, partyId: true, version: true },
  });
  if (!invoice) throw new Error("Invoice not found in this book.");
  if (invoice.status !== "draft") throw new Error("Only draft invoices can be approved.");

  // A draft corrected during review (version bumped by the edit flow) lands as
  // "edited" so the correction stays visible; an untouched draft is "submitted".
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: invoice.version > 1 ? "edited" : "submitted" },
  });

  revalidatePath("/");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoice.id}`);
  revalidatePath(`/parties/${invoice.partyId}`);
  // The delivery portal's "awaiting review" count keys off status === "draft".
  revalidatePath("/delivery");
}

/* ------------------------- Delivery-confirmation photo ------------------------- */

const PHOTO_PREFIX_RE = /^data:image\/(jpeg|png|webp|heic|heif);base64,/;

const PhotoSchema = z.object({
  invoiceId: z.string().min(1),
  /** Compressed client-side (canvas → JPEG); hard cap keeps rows small. */
  photoDataUrl: z
    .string()
    .regex(PHOTO_PREFIX_RE, "Photo must be a JPEG, PNG, WEBP or HEIC image.")
    .max(900_000, "Photo too large — try again (it is compressed automatically)."),
});

/** Decoded photo hard cap (~5MB) — backstop behind the string-length cap. */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/**
 * The data-URL prefix is only a client CLAIM — verify the payload actually is
 * an image of the claimed type before storing it in the append-only record.
 * Node's Buffer.from(str, "base64") never throws (it silently skips junk), so
 * the base64 format must be checked up front, then the decoded magic bytes
 * must match the declared MIME. Throws plain, user-friendly errors.
 */
function assertValidPhotoPayload(dataUrl: string): void {
  const match = PHOTO_PREFIX_RE.exec(dataUrl);
  if (!match) throw new Error("Photo must be a JPEG, PNG, WEBP or HEIC image.");
  const claimed = match[1];
  const payload = dataUrl.slice(match[0].length);

  // Strict base64: only valid characters, proper padding, non-empty.
  if (
    payload.length === 0 ||
    payload.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(payload)
  ) {
    throw new Error("Photo data looks broken — please take the photo again.");
  }

  const buf = Buffer.from(payload, "base64");
  if (buf.length > MAX_PHOTO_BYTES) {
    throw new Error("Photo too large — try again (it is compressed automatically).");
  }

  // Magic bytes must match the CLAIMED type (not just any image type).
  let ok = false;
  if (claimed === "jpeg") {
    ok = buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  } else if (claimed === "png") {
    ok =
      buf.length >= 8 &&
      buf
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  } else if (claimed === "webp") {
    ok =
      buf.length >= 12 &&
      buf.toString("latin1", 0, 4) === "RIFF" &&
      buf.toString("latin1", 8, 12) === "WEBP";
  } else {
    // heic / heif — ISO-BMFF container: "ftyp" box marker at byte offset 4.
    ok = buf.length >= 12 && buf.toString("latin1", 4, 8) === "ftyp";
  }
  if (!ok) {
    throw new Error("This file is not a real photo — please attach an actual image.");
  }
}

/**
 * Attach the "package delivered" confirmation photo to the invoice's LATEST
 * delivery record (plan §4.1: optional convenience, never a submit gate).
 * Append-only discipline: once a record carries a photo it can't be replaced —
 * an edit creates a new record version which can then carry a fresh photo.
 * The delivery role may only attach to invoices it created.
 */
export async function attachDeliveryPhoto(input: z.infer<typeof PhotoSchema>) {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  assertCanMutate(ctx, "invoices", [...OFFICE_ROLES, "delivery"]);

  const parsed = PhotoSchema.parse(input);
  assertValidPhotoPayload(parsed.photoDataUrl);

  const invoice = await prisma.invoice.findFirst({
    where: { id: parsed.invoiceId, entityId: ctx.entityId },
    include: { deliveryRecords: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!invoice) throw new Error("Invoice not found in this book.");
  if (ctx.user.role === "delivery" && invoice.createdById !== ctx.user.id) {
    throw new Error("You can only add photos to invoices you created.");
  }

  const latest = invoice.deliveryRecords[0];
  if (!latest) throw new Error("No delivery record exists for this invoice yet.");
  if (latest.optionalPhoto) {
    throw new Error("This delivery already has a photo. Edits create a new version that can take a fresh one.");
  }

  await prisma.deliveryRecord.update({
    where: { id: latest.id },
    data: { optionalPhoto: parsed.photoDataUrl },
  });

  revalidatePath(`/invoices/${invoice.id}`);
  revalidatePath("/delivery");
}
