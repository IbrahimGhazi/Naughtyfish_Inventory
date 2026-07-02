"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { assertRole, OFFICE_ROLES } from "@/lib/roles";
import { entityScope, assertEntityAccess, storeScope } from "@/lib/scope";
import { CITY_NAMES } from "@/lib/geo";
import { SHIPMENT_STATUSES } from "@/lib/shipments";
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
  assertRole(ctx, [...OFFICE_ROLES, "store_keeper", "north_employee"]);
  await assertEntityAccess(ctx);

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

  const shipment = await prisma.shipment.create({
    data: {
      reference: emptyToNull(parsed.reference),
      status: "preparing",
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
  assertRole(ctx, [...OFFICE_ROLES, "store_keeper", "north_employee"]);
  await assertEntityAccess(ctx);
  const parsed = UpdateStatusSchema.parse(input);

  const shipment = await prisma.shipment.findFirst({
    where: { id: parsed.shipmentId, ...entityScope(ctx) },
    select: { id: true },
  });
  if (!shipment) throw new Error("Shipment not found in this book.");

  await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      status: parsed.status,
      deliveredAt: parsed.status === "delivered" ? new Date() : null,
    },
  });

  revalidatePath("/shipments");
  revalidatePath(`/shipments/${shipment.id}`);
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
  assertRole(ctx, [...OFFICE_ROLES, "store_keeper", "north_employee"]);
  await assertEntityAccess(ctx);
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
