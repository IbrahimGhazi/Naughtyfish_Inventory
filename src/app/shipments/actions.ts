"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { assertCanMutate, OFFICE_ROLES } from "@/lib/roles";
import { entityScope, assertEntityAccess, storeScope } from "@/lib/scope";
import { requireFeature } from "@/lib/config";
import { CITY_NAMES } from "@/lib/geo";
import { SHIPMENT_STATUSES, SHIPMENT_TYPES, TRANSPORT_MODES } from "@/lib/shipments";
import { PROCESS_TYPES, PROCESS_TYPE_LABELS, type ProcessType } from "@/lib/enums";
import { assertCapabilities, cleanTypes, computeLoss } from "@/lib/processes";
import { issueStock, receiveStock } from "@/lib/stock";
import { revalidatePath } from "next/cache";

const CityEnum = z.enum(CITY_NAMES as [string, ...string[]]);

// datetime-local sends "YYYY-MM-DDTHH:mm" (no zone). Accept empty → undefined.
const OptionalDateTime = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

const CreateShipmentSchema = z.object({
  reference: z.string().trim().max(120).optional(),
  shipmentType: z.enum(SHIPMENT_TYPES).default("bulk_long_haul"),
  transportMode: z.enum(TRANSPORT_MODES).default("road"),
  originName: z.string().trim().min(1, "Origin name is required").max(200),
  originCity: CityEnum,
  originStoreId: z.string().optional(),
  destinationName: z.string().trim().max(200).optional(),
  destinationCity: CityEnum,
  departureAt: OptionalDateTime,
  estimatedArrivalAt: OptionalDateTime,
  carrier: z.string().trim().max(120).optional(),
  driverName: z.string().trim().max(120).optional(),
  driverPhone: z.string().trim().max(40).optional(),
  invoiceId: z.string().optional(),
  partyId: z.string().optional(),
  notes: z.string().trim().max(2000).optional(),
  // Inter-store transfer payload (only used when shipmentType === "inter_store").
  destinationStoreId: z.string().optional(),
  transferItemId: z.string().optional(),
  transferKg: z.coerce.number().min(0.001).optional(),
  applyProcess: z.boolean().optional(),
  processTypes: z.array(z.enum(PROCESS_TYPES)).optional(),
  outputItemId: z.string().optional(),
  outputKg: z.coerce.number().min(0.001).optional(),
});

export type CreateShipmentInput = z.infer<typeof CreateShipmentSchema>;

function emptyToNull(v: string | undefined): string | null {
  return v && v.length > 0 ? v : null;
}

/** Parse a datetime-local (or ISO) string into a Date, or null when absent. */
function toDate(v: string | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createShipment(input: CreateShipmentInput) {
  const ctx = await getActiveContext();
  assertCanMutate(ctx, "shipments", [...OFFICE_ROLES, "store_keeper", "north_employee"]);
  await assertEntityAccess(ctx);
  await requireFeature("shipments");

  const parsed = CreateShipmentSchema.parse(input);

  // Validate optional foreign keys are all inside the active book (scoped).
  const originStoreId = emptyToNull(parsed.originStoreId);
  if (originStoreId) {
    const store = await prisma.store.findFirst({
      where: { id: originStoreId, ...storeScope(ctx) },
      select: { id: true },
    });
    if (!store) throw new Error("Origin store is not in the active book.");
  }

  const invoiceId = emptyToNull(parsed.invoiceId);
  let resolvedPartyId = emptyToNull(parsed.partyId);
  if (invoiceId) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, ...entityScope(ctx) },
      select: { id: true, partyId: true },
    });
    if (!invoice) throw new Error("Invoice is not in the active book.");
    // Linking an invoice auto-sets the consignee party when none was chosen.
    if (!resolvedPartyId) resolvedPartyId = invoice.partyId;
  }

  if (resolvedPartyId) {
    const party = await prisma.party.findFirst({
      where: { id: resolvedPartyId, ...entityScope(ctx) },
      select: { id: true },
    });
    if (!party) throw new Error("Consignee party is not in the active book.");
  }

  // Inter-store transfer: validate the origin/destination stores, the transfer
  // line, and (optionally) the process applied at the destination. The stock is
  // NOT moved here — it moves on the "delivered" transition (updateShipmentStatus).
  let transfer: {
    destinationStoreId: string;
    transferItemId: string;
    transferKg: number;
    applyProcess: boolean;
    processTypes: string;
    outputItemId: string | null;
    outputKg: number | null;
  } | null = null;

  if (parsed.shipmentType === "inter_store") {
    const destinationStoreId = emptyToNull(parsed.destinationStoreId);
    const transferItemId = emptyToNull(parsed.transferItemId);
    if (!originStoreId) throw new Error("Pick the origin store for a transfer.");
    if (!destinationStoreId) throw new Error("Pick the destination store.");
    if (destinationStoreId === originStoreId) throw new Error("Origin and destination stores must differ.");
    if (!transferItemId || !parsed.transferKg) throw new Error("Add the item and weight to transfer.");

    const [destStore, transferItem] = await Promise.all([
      prisma.store.findFirst({ where: { id: destinationStoreId, ...storeScope(ctx) } }),
      prisma.item.findFirst({ where: { id: transferItemId, entityId: ctx.entityId }, select: { id: true } }),
    ]);
    if (!destStore) throw new Error("Destination store is not accessible in this book.");
    if (!transferItem) throw new Error("Transfer item is not in the active book.");

    let outputItemId: string | null = null;
    let outputKg: number | null = null;
    let types: ProcessType[] = [];
    if (parsed.applyProcess) {
      types = cleanTypes(parsed.processTypes ?? []);
      if (types.length === 0) throw new Error("Pick at least one process for the transfer.");
      assertCapabilities(destStore, types); // destination performs the work
      const outId = emptyToNull(parsed.outputItemId);
      if (!outId || !parsed.outputKg) throw new Error("Add the processed item and output weight.");
      const outItem = await prisma.item.findFirst({ where: { id: outId, entityId: ctx.entityId } });
      if (!outItem) throw new Error("Processed output item is not in the active book.");
      if (outItem.nature !== "processed") throw new Error("The output must be a processed item.");
      computeLoss(parsed.transferKg, parsed.outputKg); // throws if output > input
      outputItemId = outItem.id;
      outputKg = parsed.outputKg;
    }

    transfer = {
      destinationStoreId,
      transferItemId,
      transferKg: parsed.transferKg,
      applyProcess: !!parsed.applyProcess,
      processTypes: JSON.stringify(types),
      outputItemId,
      outputKg,
    };
  }

  const shipment = await prisma.shipment.create({
    data: {
      reference: emptyToNull(parsed.reference),
      status: "preparing",
      shipmentType: parsed.shipmentType,
      transportMode: parsed.transportMode,
      originName: parsed.originName,
      originCity: parsed.originCity,
      destinationName: emptyToNull(parsed.destinationName),
      destinationCity: parsed.destinationCity,
      departureAt: toDate(parsed.departureAt),
      estimatedArrivalAt: toDate(parsed.estimatedArrivalAt),
      carrier: emptyToNull(parsed.carrier),
      driverName: emptyToNull(parsed.driverName),
      driverPhone: emptyToNull(parsed.driverPhone),
      notes: emptyToNull(parsed.notes),
      entityId: ctx.entityId,
      originStoreId,
      invoiceId,
      partyId: resolvedPartyId,
      destinationStoreId: transfer?.destinationStoreId ?? null,
      transferItemId: transfer?.transferItemId ?? null,
      transferKg: transfer?.transferKg ?? null,
      applyProcess: transfer?.applyProcess ?? false,
      processTypes: transfer?.processTypes ?? "[]",
      outputItemId: transfer?.outputItemId ?? null,
      outputKg: transfer?.outputKg ?? null,
    },
  });

  revalidatePath("/shipments");
  revalidatePath("/"); // dashboard map renders shipments
  return { id: shipment.id };
}

const UpdateStatusSchema = z.object({
  shipmentId: z.string().min(1),
  status: z.enum(SHIPMENT_STATUSES),
});

export type UpdateShipmentStatusInput = z.infer<typeof UpdateStatusSchema>;

/**
 * Change a shipment's status. When moving to "delivered" we stamp deliveredAt
 * (server time); moving away from "delivered" clears it again so the timeline
 * stays truthful.
 */
export async function updateShipmentStatus(input: UpdateShipmentStatusInput) {
  const ctx = await getActiveContext();
  assertCanMutate(ctx, "shipments", [...OFFICE_ROLES, "store_keeper", "north_employee"]);
  await assertEntityAccess(ctx);
  await requireFeature("shipments");
  const parsed = UpdateStatusSchema.parse(input);

  const shipment = await prisma.shipment.findFirst({
    where: { id: parsed.shipmentId, ...entityScope(ctx) },
    select: {
      id: true, reference: true, shipmentType: true, stockMovedAt: true,
      originStoreId: true, destinationStoreId: true,
      transferItemId: true, transferKg: true,
      applyProcess: true, outputItemId: true, outputKg: true, processTypes: true,
    },
  });
  if (!shipment) throw new Error("Shipment not found in this book.");

  const isTransferReady =
    parsed.status === "delivered" &&
    shipment.shipmentType === "inter_store" &&
    shipment.stockMovedAt === null &&
    !!shipment.originStoreId &&
    !!shipment.destinationStoreId &&
    !!shipment.transferItemId &&
    shipment.transferKg !== null;

  await prisma.$transaction(async (tx) => {
    if (isTransferReady) {
      // Idempotency: only the first "delivered" wins the claim on stockMovedAt,
      // so re-delivering (or delivered → in_transit → delivered) can't double-post.
      const claim = await tx.shipment.updateMany({
        where: { id: shipment.id, entityId: ctx.entityId, stockMovedAt: null },
        data: { stockMovedAt: new Date() },
      });
      if (claim.count === 1) {
        const kgIn = Number(shipment.transferKg);
        const ref = shipment.reference ? ` ${shipment.reference}` : "";
        const typeNote = cleanTypes(JSON.parse(shipment.processTypes || "[]"))
          .map((t) => PROCESS_TYPE_LABELS[t]).join(", ");
        await issueStock(tx, ctx.entityId, shipment.originStoreId!, shipment.transferItemId!, kgIn,
          `Transfer${ref}`, { shipmentId: shipment.id });
        if (shipment.applyProcess && shipment.outputItemId && shipment.outputKg !== null) {
          await receiveStock(tx, ctx.entityId, shipment.destinationStoreId!, shipment.outputItemId,
            Number(shipment.outputKg), `Transfer${ref}: ${typeNote}`, { shipmentId: shipment.id });
        } else {
          await receiveStock(tx, ctx.entityId, shipment.destinationStoreId!, shipment.transferItemId!,
            kgIn, `Transfer${ref}`, { shipmentId: shipment.id });
        }
      }
    }

    await tx.shipment.update({
      where: { id: shipment.id },
      data: {
        status: parsed.status,
        deliveredAt: parsed.status === "delivered" ? new Date() : null,
      },
    });
  });

  revalidatePath("/shipments");
  revalidatePath(`/shipments/${shipment.id}`);
  revalidatePath("/inventory");
  revalidatePath("/");
  return { id: shipment.id, status: parsed.status };
}

const UpdateEtaSchema = z.object({
  shipmentId: z.string().min(1),
  estimatedArrivalAt: OptionalDateTime,
});

export type UpdateShipmentEtaInput = z.infer<typeof UpdateEtaSchema>;

/** Quick-edit a shipment's ETA (owner adjusts the estimate). */
export async function updateShipmentEta(input: UpdateShipmentEtaInput) {
  const ctx = await getActiveContext();
  assertCanMutate(ctx, "shipments", [...OFFICE_ROLES, "store_keeper", "north_employee"]);
  await assertEntityAccess(ctx);
  await requireFeature("shipments");
  const parsed = UpdateEtaSchema.parse(input);

  const shipment = await prisma.shipment.findFirst({
    where: { id: parsed.shipmentId, ...entityScope(ctx) },
    select: { id: true },
  });
  if (!shipment) throw new Error("Shipment not found in this book.");

  await prisma.shipment.update({
    where: { id: shipment.id },
    data: { estimatedArrivalAt: toDate(parsed.estimatedArrivalAt) },
  });

  revalidatePath("/shipments");
  revalidatePath(`/shipments/${shipment.id}`);
  revalidatePath("/");
  return { id: shipment.id };
}
