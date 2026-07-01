import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { dateShort } from "@/lib/format";
import { Chip, PageHeader, PrimaryButton, StatusChip } from "@/components/ui";
import {
  SHIPMENT_STATUSES,
  STATUS_LABELS,
  STATUS_TIMELINE,
  statusSortWeight,
  etaHint,
} from "@/lib/shipments";

export const dynamic = "force-dynamic";

const TABS = ["all", ...SHIPMENT_STATUSES] as const;
type Tab = (typeof TABS)[number];

/** A short route code from a city name (e.g. "Karachi" → "KHI", "Lahore" → "LHE"). */
function cityCode(name: string | null | undefined): string {
  if (!name) return "—";
  const cleaned = name.trim();
  if (cleaned.toLowerCase() === "karachi") return "KHI";
  if (cleaned.toLowerCase() === "lahore") return "LHE";
  if (cleaned.toLowerCase() === "islamabad") return "ISB";
  if (cleaned.toLowerCase() === "peshawar") return "PEW";
  return cleaned.slice(0, 3).toUpperCase();
}

/** How far along preparing→in_transit→delivered a status reads (for the progress bar). */
function progressPct(status: string): number {
  switch (status) {
    case "delivered":
      return 100;
    case "in_transit":
      return 66;
    case "delayed":
      return 55;
    case "preparing":
      return 22;
    default:
      return 0; // cancelled
  }
}

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
    <div className="animate-rise space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Shipments"
        subtitle="Karachi cold-chain dispatches heading north."
        action={
          <PrimaryButton href="/shipments/new" data-testid="ship-new-link">
            + New shipment
          </PrimaryButton>
        }
      />

      {/* Status filter chips (searchParams-driven). */}
      <nav className="flex flex-wrap gap-2" data-testid="ship-tabs">
        {TABS.map((t) => {
          const active = t === activeTab;
          const label = t === "all" ? "All" : STATUS_LABELS[t];
          return (
            <Link
              key={t}
              href={t === "all" ? "/shipments" : `/shipments?status=${t}`}
              data-testid={`ship-tab-${t}`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-colors ${
                active
                  ? "border-transparent text-accent-deep"
                  : "border-hair bg-card text-muted hover:bg-card2"
              }`}
              style={active ? { background: "var(--accent-tint)" } : undefined}
            >
              {label}
              <span className={active ? "text-accent-deep/70" : "text-faint"}>
                {counts[t] ?? 0}
              </span>
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <p className="text-sm text-faint">
          {activeTab === "all"
            ? "No shipments yet."
            : `No ${STATUS_LABELS[activeTab as (typeof SHIPMENT_STATUSES)[number]].toLowerCase()} shipments.`}{" "}
          <Link href="/shipments/new" className="font-semibold text-accent-deep hover:underline">
            Create one →
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
          {rows.map((s) => {
            const hint = etaHint(s.estimatedArrivalAt, s.status, now);
            const originCode = cityCode(s.originCity ?? "Karachi");
            const destCode = cityCode(s.destinationCity);
            const fillPct = progressPct(s.status);
            const barColor =
              s.status === "delayed"
                ? "var(--neg)"
                : s.status === "delivered"
                  ? "var(--pos)"
                  : "var(--accent)";
            // Stage-dots: how far along the preparing→in_transit→delivered timeline.
            const reachedIndex =
              s.status === "delivered"
                ? 2
                : s.status === "in_transit" || s.status === "delayed"
                  ? 1
                  : s.status === "preparing"
                    ? 0
                    : -1;
            const subline = [
              s.carrier ? `via ${s.carrier}` : null,
              s.estimatedArrivalAt ? `ETA ${dateShort(s.estimatedArrivalAt)}` : "no ETA",
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <Link
                key={s.id}
                href={`/shipments/${s.id}`}
                data-testid={`ship-row-${s.id}`}
                className="block rounded-xl border border-hair bg-card p-[18px] transition-colors hover:bg-card2"
              >
                <div className="mb-1 flex items-center gap-2.5">
                  <span className="font-mono text-[11.5px] text-gold">
                    {s.reference ?? s.id.slice(0, 8)}
                  </span>
                  <div className="flex-1" />
                  <StatusChip status={s.status} label={STATUS_LABELS[s.status as (typeof SHIPMENT_STATUSES)[number]] ?? s.status} />
                </div>

                <div className="font-serif text-[20px] font-semibold text-ink">
                  {s.originCity ?? "Karachi"} <span className="text-faint">→</span>{" "}
                  {s.destinationCity}
                </div>
                <div className="mt-1 text-[12.5px] text-muted">
                  {subline}
                  <span
                    className={`ml-2 ${
                      hint.tone === "danger"
                        ? "text-neg"
                        : hint.tone === "warn"
                          ? "text-warn"
                          : hint.tone === "good"
                            ? "text-pos"
                            : "text-faint"
                    }`}
                  >
                    {hint.text}
                  </span>
                </div>

                {/* KHI — dest progress bar */}
                <div className="mt-3.5 flex items-center gap-2.5">
                  <span className="shrink-0 text-[10.5px] font-semibold text-faint">
                    {originCode}
                  </span>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-row">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${fillPct}%`, background: barColor }}
                    />
                  </div>
                  <span className="shrink-0 text-[10.5px] font-semibold text-faint">
                    {destCode}
                  </span>
                </div>

                {/* Stage dots: preparing → in transit → delivered */}
                <div className="mt-3 flex justify-between border-t border-row pt-3">
                  {STATUS_TIMELINE.map((step, i) => {
                    const done = reachedIndex >= i;
                    const stuck = s.status === "delayed" && step === "in_transit";
                    return (
                      <div key={step} className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            background: stuck
                              ? "var(--neg)"
                              : done
                                ? "var(--accent)"
                                : "var(--row)",
                          }}
                        />
                        <span
                          className={`text-[11px] font-semibold ${
                            stuck ? "text-neg" : done ? "text-text" : "text-faint"
                          }`}
                        >
                          {STATUS_LABELS[step]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {s.status === "delayed" && (
                  <div className="mt-2.5 text-[12px] text-neg">
                    ⚠ Marked delayed — in transit but behind schedule.
                  </div>
                )}
                {s.party && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-[12px] text-muted">
                    <span className="text-faint">Consignee</span>
                    <Chip tone="neutral">{s.party.name}</Chip>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
