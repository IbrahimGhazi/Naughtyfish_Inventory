import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { dateShort } from "@/lib/format";
import {
  SHIPMENT_STATUSES,
  STATUS_LABELS,
  statusColor,
  statusSortWeight,
  etaHint,
  type EtaTone,
} from "@/lib/shipments";

export const dynamic = "force-dynamic";

const TABS = ["all", ...SHIPMENT_STATUSES] as const;
type Tab = (typeof TABS)[number];

const ETA_TONE_CLASS: Record<EtaTone, string> = {
  muted: "text-slate-400 dark:text-slate-500",
  info: "text-cyan-700 dark:text-cyan-400",
  warn: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
  good: "text-emerald-600 dark:text-emerald-400",
};

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const ctx = await getActiveContext();
  const sp = await searchParams;
  const activeTab: Tab = (TABS as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as Tab)
    : "all";

  const where = {
    ...entityScope(ctx),
    ...(activeTab !== "all" ? { status: activeTab } : {}),
  };

  const shipments = await prisma.shipment.findMany({
    where,
    include: { party: true },
    // DB order is a starting point; the real sort (attention-first, then ETA) is
    // applied below since it depends on statusSortWeight.
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();

  // Sort in_transit/delayed first (by statusSortWeight), then by ETA ascending
  // (soonest / most-overdue first). Rows without an ETA sort last within a group.
  const rows = [...shipments].sort((a, b) => {
    const w = statusSortWeight(a.status) - statusSortWeight(b.status);
    if (w !== 0) return w;
    const ae = a.estimatedArrivalAt ? a.estimatedArrivalAt.getTime() : Infinity;
    const be = b.estimatedArrivalAt ? b.estimatedArrivalAt.getTime() : Infinity;
    if (ae !== be) return ae - be;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  // Per-tab counts for the filter chips.
  const all = await prisma.shipment.findMany({
    where: entityScope(ctx),
    select: { status: true },
  });
  const counts: Record<string, number> = { all: all.length };
  for (const s of SHIPMENT_STATUSES) counts[s] = 0;
  for (const s of all) counts[s.status] = (counts[s.status] ?? 0) + 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Shipments</h1>
        <Link
          href="/shipments/new"
          data-testid="ship-new-link"
          className="rounded-md bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-800"
        >
          + New shipment
        </Link>
      </div>

      {/* Status filter tabs (searchParams-driven). */}
      <nav className="flex flex-wrap gap-2" data-testid="ship-tabs">
        {TABS.map((t) => {
          const active = t === activeTab;
          const label = t === "all" ? "All" : STATUS_LABELS[t];
          return (
            <Link
              key={t}
              href={t === "all" ? "/shipments" : `/shipments?status=${t}`}
              data-testid={`ship-tab-${t}`}
              className={`rounded-full border px-3 py-1 text-sm ${
                active
                  ? "border-cyan-700 bg-cyan-700 text-white dark:border-cyan-500 dark:bg-cyan-600"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {label}
              <span className={`ml-1.5 text-xs ${active ? "text-cyan-100" : "text-slate-400 dark:text-slate-500"}`}>
                {counts[t] ?? 0}
              </span>
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          {activeTab === "all"
            ? "No shipments yet."
            : `No ${STATUS_LABELS[activeTab as (typeof SHIPMENT_STATUSES)[number]].toLowerCase()} shipments.`}{" "}
          <Link href="/shipments/new" className="text-cyan-700 underline dark:text-cyan-400">
            Create one →
          </Link>
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400 dark:bg-slate-800/50 dark:text-slate-500">
              <tr>
                <th className="px-4 py-2">Reference</th>
                <th className="px-4 py-2">Route</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Departure</th>
                <th className="px-4 py-2">ETA</th>
                <th className="px-4 py-2">Consignee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((s) => {
                const hint = etaHint(s.estimatedArrivalAt, s.status, now);
                return (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800"
                    data-testid={`ship-row-${s.id}`}
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/shipments/${s.id}`}
                        className="font-mono text-cyan-700 hover:underline dark:text-cyan-400"
                      >
                        {s.reference ?? s.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-slate-700 dark:text-slate-200">{s.originCity ?? "—"}</span>
                      <span className="mx-1.5 text-slate-400 dark:text-slate-500">→</span>
                      <span className="text-slate-700 dark:text-slate-200">{s.destinationCity}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(s.status)}`}
                      >
                        {STATUS_LABELS[s.status as (typeof SHIPMENT_STATUSES)[number]] ?? s.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                      {s.departureAt ? dateShort(s.departureAt) : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-slate-500 dark:text-slate-400">
                        {s.estimatedArrivalAt ? dateShort(s.estimatedArrivalAt) : "—"}
                      </span>
                      <span className={`ml-2 text-xs ${ETA_TONE_CLASS[hint.tone]}`}>{hint.text}</span>
                    </td>
                    <td className="px-4 py-2">
                      {s.party ? (
                        <Link
                          href={`/parties/${s.partyId}`}
                          className="hover:text-cyan-700 dark:hover:text-cyan-400"
                        >
                          {s.party.name}
                        </Link>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
