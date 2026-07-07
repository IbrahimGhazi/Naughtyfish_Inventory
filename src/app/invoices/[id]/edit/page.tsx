import { notFound } from "next/navigation";
import { PageHeader, BackLink } from "@/components/ui";
import { getCopy } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
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
  requirePage(ctx, "invoices");
  const t = await getCopy();
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
  }));

  return (
    <div className="animate-rise space-y-4">
      <div>
        <BackLink href={`/invoices/${invoice.id}`}>
          {t("invoices.edit.backPrefix")} #{invoice.invoiceNumber}
        </BackLink>
        <PageHeader
          eyebrow={t("invoices.edit.eyebrow")}
          title={`${t("invoices.edit.titlePrefix")} #${invoice.invoiceNumber}`}
          subtitle={t("invoices.edit.subtitle")}
        />
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
