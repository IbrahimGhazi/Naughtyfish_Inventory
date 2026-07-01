import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import type { Channel } from "@/lib/billing";
import EditInvoiceForm, {
  type EditFormItem,
  type EditLineRow,
} from "./EditInvoiceForm";

export const dynamic = "force-dynamic";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getActiveContext();
  const scope = entityScope(ctx);

  const invoice = await prisma.invoice.findFirst({
    where: { id, ...scope },
    include: {
      party: true,
      lineItems: { include: { item: true } },
    },
  });
  if (!invoice) notFound();

  const channel = invoice.channel as Channel;

  const [items, glazing] = await Promise.all([
    prisma.item.findMany({ where: { ...scope, active: true }, orderBy: { name: "asc" } }),
    prisma.glazingSetting.findMany({ where: scope }),
  ]);

  // Item-level expected glazing baseline for the live variance hint.
  const expectedByItem = new Map<string, number>();
  for (const g of glazing) {
    if (g.partyId === null && !expectedByItem.has(g.itemId)) {
      expectedByItem.set(g.itemId, Number(g.expectedGlazingPct));
    }
  }

  const formItems: EditFormItem[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    isPrawn: i.isPrawn,
    packetsPerCarton: i.packetsPerCarton,
    expectedGlazingPct:
      expectedByItem.get(i.id) ?? (i.defaultGlazingPct === null ? null : Number(i.defaultGlazingPct)),
  }));

  // Prefill each row from the DB, casting Decimals to numbers -> strings.
  // North lines drive glazing from the final/net weight; local lines use gross only.
  const initialLines: EditLineRow[] = invoice.lineItems.map((li) => ({
    itemId: li.itemId,
    grossWeightKg: String(Number(li.grossWeightKg)),
    finalWeightKg:
      channel === "north"
        ? li.finalWeightKg !== null
          ? String(Number(li.finalWeightKg))
          : String(Number(li.netWeightKg))
        : "",
    glazingPercent: "",
    ratePerKg: String(Number(li.ratePerKg)),
    cartonCount: li.cartonCount !== null ? String(li.cartonCount) : "",
    packetCount: li.packetCount !== null ? String(li.packetCount) : "",
    expectedPacketCount: "",
  }));

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/invoices/${invoice.id}`} className="text-xs text-slate-400 hover:text-cyan-700 dark:text-slate-500 dark:hover:text-cyan-400">
          ← Invoice #{invoice.invoiceNumber}
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Edit Invoice #{invoice.invoiceNumber}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Goods arrived short? Adjust the lines below — amounts recompute through the shared billing
          engine, the invoice number stays the same, and a new versioned delivery record is appended.
        </p>
      </div>
      <EditInvoiceForm
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoiceNumber}
        partyName={invoice.party.name}
        channel={channel}
        items={formItems}
        initialLines={initialLines}
        initialNotes={invoice.notes ?? ""}
      />
    </div>
  );
}
