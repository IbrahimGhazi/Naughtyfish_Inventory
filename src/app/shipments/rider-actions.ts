"use server";

import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { assertRole, OFFICE_ROLES } from "@/lib/roles";
import { entityScope, assertEntityAccess } from "@/lib/scope";
import { requireFeature } from "@/lib/config";
import { revalidatePath } from "next/cache";

const RIDER_ROLES = [...OFFICE_ROLES, "delivery"];

/** Office assigns (or clears, with null) the rider driving a shipment. */
export async function assignShipmentRider(shipmentId: string, riderId: string | null) {
  const ctx = await getActiveContext();
  assertRole(ctx, OFFICE_ROLES);
  await assertEntityAccess(ctx);
  await requireFeature("shipments");
  const scope = entityScope(ctx);

  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, ...scope },
    select: { id: true },
  });
  if (!shipment) throw new Error("Shipment not found in this book.");

  if (riderId) {
    const rider = await prisma.user.findFirst({
      where: { id: riderId, entityId: ctx.entityId, role: "delivery" },
      select: { id: true },
    });
    if (!rider) throw new Error("That rider is not a delivery user in this book.");
  }

  await prisma.shipment.update({
    where: { id: shipmentId },
    data: { assignedRiderId: riderId },
  });
  revalidatePath(`/shipments/${shipmentId}`);
  revalidatePath("/shipments");
  revalidatePath("/delivery");
}

/** Rider self-selects the truck delivery they're doing (if it's free). */
export async function claimShipment(shipmentId: string) {
  const ctx = await getActiveContext();
  assertRole(ctx, RIDER_ROLES);
  await assertEntityAccess(ctx);
  await requireFeature("shipments");
  const scope = entityScope(ctx);

  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, ...scope },
    select: { id: true, assignedRiderId: true },
  });
  if (!shipment) throw new Error("Delivery not found.");
  if (shipment.assignedRiderId && shipment.assignedRiderId !== ctx.user.id) {
    throw new Error("This delivery is already assigned to another rider.");
  }

  await prisma.shipment.update({
    where: { id: shipmentId },
    data: { assignedRiderId: ctx.user.id },
  });
  revalidatePath("/delivery");
  revalidatePath(`/shipments/${shipmentId}`);
}

/** Rider stops driving this delivery (keeps the last-known location). */
export async function releaseShipment(shipmentId: string) {
  const ctx = await getActiveContext();
  assertRole(ctx, RIDER_ROLES);
  await assertEntityAccess(ctx);
  const scope = entityScope(ctx);

  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, ...scope },
    select: { id: true, assignedRiderId: true },
  });
  if (!shipment) throw new Error("Delivery not found.");
  const isOffice = OFFICE_ROLES.includes(ctx.user.role);
  if (shipment.assignedRiderId !== ctx.user.id && !isOffice) {
    throw new Error("You can only stop a delivery assigned to you.");
  }

  await prisma.shipment.update({
    where: { id: shipmentId },
    data: { assignedRiderId: null },
  });
  revalidatePath("/delivery");
  revalidatePath(`/shipments/${shipmentId}`);
}
