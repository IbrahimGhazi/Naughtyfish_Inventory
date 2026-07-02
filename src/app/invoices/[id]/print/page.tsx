import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { canAccessPage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { pkr, kg, pct, dateShort } from "@/lib/format";
import { getCopy } from "@/lib/config";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getActiveContext();
  const t = await getCopy();

  // North (frozen) vs Local (fresh) note templates. Exact wording is an owner
  // Open Question (plan §10); these are safe defaults capturing the billing basis.
  const CHANNEL_NOTE: Record<string, string> = {
    north: t("invoices.print.noteNorth"),
    local: t("invoices.print.noteLocal"),
  };

  const invoice = await prisma.invoice.findFirst({
    where: { id, ...entityScope(ctx) },
    include: {
      party: true,
      entity: true,
      lineItems: { include: { item: true } },
    },
  });
  if (!invoice) notFound();

  // Delivery may print ONLY invoices it created; other roles need the grant.
  if (ctx.user.role === "delivery") {
    if (invoice.createdById !== ctx.user.id) redirect("/delivery");
  } else if (!canAccessPage(ctx.user.role, "invoices")) {
    redirect("/");
  }

  const total = Number(invoice.totalAmount);

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-slate-900 print:p-0">
      {/* Screen-only toolbar (hidden on print). */}
      <div className="no-print mb-6 flex items-center justify-between">
        <Link
          href={`/invoices/${invoice.id}`}
          className="text-[12.5px] font-semibold text-slate-500 hover:text-slate-900"
        >
          {t("invoices.print.back")}
        </Link>
        <PrintButton />
      </div>

      {/* Company / book header */}
      <div className="flex items-start justify-between border-b border-slate-300 pb-4">
        <div>
          <div className="text-2xl font-bold tracking-tight">{invoice.entity.name}</div>
          <div className="text-sm text-slate-500">{t("invoices.print.tagline")}</div>
        </div>
        <div className="text-right text-sm">
          <div className="text-lg font-semibold">{t("invoices.print.invoiceHeading")}</div>
          <div>
            #<span className="font-mono">{invoice.invoiceNumber}</span>
          </div>
          {invoice.referenceNumber && (
            <div className="text-slate-500">
              {t("invoices.print.refPrefix")} <span className="font-mono">{invoice.referenceNumber}</span>
            </div>
          )}
          <div className="text-slate-500">{dateShort(invoice.date)}</div>
        </div>
      </div>

      {/* Bill-to */}
      <div className="mt-4 text-sm">
        <div className="text-xs uppercase text-slate-400">{t("invoices.print.billTo")}</div>
        <div className="font-semibold">{invoice.party.name}</div>
        {invoice.party.address && <div className="text-slate-600">{invoice.party.address}</div>}
        <div className="text-slate-600">
          {invoice.party.ntn ? `${t("invoices.print.ntnPrefix")} ${invoice.party.ntn}` : t("invoices.print.noNtn")}
        </div>
      </div>

      {/* Line table */}
      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-slate-300 text-left">
            <th className="py-2">{t("invoices.print.colItem")}</th>
            <th className="py-2 text-right">{t("invoices.print.colGross")}</th>
            <th className="py-2 text-right">{t("invoices.print.colGlazing")}</th>
            <th className="py-2 text-right">{t("invoices.print.colNet")}</th>
            <th className="py-2 text-right">{t("invoices.print.colRate")}</th>
            <th className="py-2 text-right">{t("invoices.print.colAmount")}</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.map((li) => (
            <tr key={li.id} className="border-b border-slate-200">
              <td className="py-2">{li.item.name}</td>
              <td className="py-2 text-right">{kg(Number(li.grossWeightKg))}</td>
              <td className="py-2 text-right">{pct(Number(li.glazingPct))}</td>
              <td className="py-2 text-right">{kg(Number(li.netWeightKg))}</td>
              <td className="py-2 text-right">{pkr(Number(li.ratePerKg))}</td>
              <td className="py-2 text-right font-medium">{pkr(Number(li.amount))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-300">
            <td colSpan={5} className="py-2 text-right text-xs uppercase text-slate-500">
              {t("invoices.print.total")}
            </td>
            <td className="py-2 text-right text-lg font-bold">{pkr(total)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Notes block — channel template + any invoice-specific notes. */}
      <div className="mt-6 rounded border border-slate-200 p-3 text-xs text-slate-600">
        <div className="font-semibold uppercase text-slate-400">{t("invoices.print.notes")}</div>
        <p className="mt-1">{CHANNEL_NOTE[invoice.channel] ?? ""}</p>
        {invoice.notes && <p className="mt-2 whitespace-pre-wrap text-slate-700">{invoice.notes}</p>}
      </div>

      {/* Signature line — dispute defense. */}
      <div className="mt-12 flex items-end justify-between text-sm">
        <div>
          <div className="w-64 border-t border-slate-400 pt-1 text-xs text-slate-500">
            {t("invoices.print.receivedBy")}
          </div>
        </div>
        <div className="text-right">
          <div className="w-48 border-t border-slate-400 pt-1 text-xs text-slate-500">
            {t("invoices.print.dateLabel")}
          </div>
        </div>
      </div>
    </div>
  );
}
