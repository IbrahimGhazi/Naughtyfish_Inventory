import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage, OFFICE_ROLES } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { getAppConfig, getCopy } from "@/lib/config";
import { pkr, kg, dateShort } from "@/lib/format";
import { PROCESS_TYPE_LABELS, type ProcessType } from "@/lib/enums";
import { parseTypes } from "@/lib/processes";
import { PageHeader, Card, Kpi, StatusChip, Chip, Th } from "@/components/ui";
import { NewProcessForm, ProcessRowActions, CostChip } from "./ProcessControls";

export const dynamic = "force-dynamic";

/**
 * In-house transformation tracker: raw stock worked into finished product at a
 * store (with yield/loss), moving inventory. Legacy vendor "send-out" records
 * (kind = "dispatch") still render with their original lifecycle actions.
 * The module can be switched off per customer in /platform.
 */
export default async function ProcessesPage() {
  const ctx = await getActiveContext();
  requirePage(ctx, "processes");
  const cfg = await getAppConfig();
  const t = await getCopy();
  if (!cfg.features.processes) redirect("/");
  const scope = entityScope(ctx);

  const [processes, items, stores, invLines] = await Promise.all([
    prisma.process.findMany({
      where: scope,
      include: {
        inputItem: { select: { name: true } },
        outputItem: { select: { name: true } },
        store: { select: { name: true } },
        item: { select: { name: true } },
        fromStore: { select: { name: true } },
        expenseEntry: { select: { id: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.item.findMany({
      where: { ...scope, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, nature: true },
    }),
    prisma.store.findMany({
      where: scope,
      orderBy: { name: "asc" },
      select: { id: true, name: true, processCapabilities: true },
    }),
    prisma.storeInventoryLine.findMany({
      where: { store: { entityId: ctx.entityId } },
      select: { storeId: true, itemId: true, totalKg: true },
    }),
  ]);

  const rawItems = items.filter((i) => i.nature === "raw").map((i) => ({ id: i.id, name: i.name }));
  const processedItems = items.filter((i) => i.nature === "processed").map((i) => ({ id: i.id, name: i.name }));
  const storeOptions = stores.map((s) => ({ id: s.id, name: s.name, capabilities: parseTypes(s.processCapabilities) }));
  const onHand: Record<string, number> = {};
  for (const l of invLines) onHand[`${l.storeId}:${l.itemId}`] = Number(l.totalKg);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const transforms = processes.filter((p) => p.kind === "transformation");
  const monthT = transforms.filter((p) => p.completedAt && new Date(p.completedAt) >= monthStart);
  const processedKg = monthT.reduce((s, p) => s + Number(p.outputKg ?? 0), 0);
  const lossKg = monthT.reduce((s, p) => s + Number(p.lossKg ?? 0), 0);
  const yields = monthT
    .filter((p) => Number(p.inputKg ?? 0) > 0)
    .map((p) => (Number(p.outputKg ?? 0) / Number(p.inputKg ?? 1)) * 100);
  const avgYield = yields.length ? yields.reduce((a, b) => a + b, 0) / yields.length : 0;
  const legacyActive = processes.filter(
    (p) => p.kind !== "transformation" && (p.status === "planned" || p.status === "in_progress"),
  ).length;

  const canCancel = OFFICE_ROLES.includes(ctx.user.role);

  return (
    <div className="animate-rise space-y-4">
      <PageHeader
        eyebrow={t("processes.eyebrow")}
        title={t("processes.title")}
        subtitle={t("processes.subtitle")}
        action={
          <NewProcessForm
            stores={storeOptions}
            rawItems={rawItems}
            processedItems={processedItems}
            onHand={onHand}
            weightUnit={cfg.terminology.weightUnit}
          />
        }
      />

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <Kpi label={t("processes.kpi.processedMonth")} value={kg(processedKg)} sub={t("processes.kpi.processedMonthSub")} />
        <Kpi label={t("processes.kpi.yield")} value={`${Math.round(avgYield * 10) / 10}%`} sub={t("processes.kpi.yieldSub")} />
        <Kpi label={t("processes.kpi.loss")} value={kg(lossKg)} sub={t("processes.kpi.lossSub")} />
        <Kpi label={t("processes.kpi.legacyActive")} value={String(legacyActive)} sub={t("processes.kpi.legacyActiveSub")} />
      </div>

      {processes.length === 0 ? (
        <Card className="p-8 text-center text-[13.5px] text-faint">
          {t("processes.empty.line1")}
          <br />
          {t("processes.empty.line2")}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>{t("processes.col.when")}</Th>
                  <Th>{t("processes.col.store")}</Th>
                  <Th>{t("processes.col.transformation")}</Th>
                  <Th align="right">{t("processes.col.inOut")}</Th>
                  <Th align="right">{t("processes.col.lossYield")}</Th>
                  <Th>{t("processes.col.applied")}</Th>
                  <Th align="right">{t("processes.col.cost")}</Th>
                  <Th align="right" className="w-[220px]"></Th>
                </tr>
              </thead>
              <tbody>
                {processes.map((p) => {
                  const isTransform = p.kind === "transformation";
                  const appliedTypes = parseTypes(p.processTypes);
                  const inKg = Number(p.inputKg ?? p.quantityKg ?? 0);
                  const outKg = Number(p.outputKg ?? 0);
                  const yieldP = isTransform && inKg > 0 ? Math.round((outKg / inKg) * 1000) / 10 : null;
                  return (
                    <tr key={p.id} className="border-b border-row align-top transition-colors hover:bg-card2">
                      <td className="px-3.5 py-3 text-[12.5px] text-muted">
                        {dateShort(p.completedAt ?? p.createdAt)}
                      </td>
                      <td className="px-3.5 py-3 text-[13px] text-text">
                        {isTransform ? (
                          p.store?.name ?? "—"
                        ) : (
                          <>
                            {p.destination}
                            {p.fromStore && (
                              <div className="text-[11.5px] text-faint">{t("processes.cell.from")} {p.fromStore.name}</div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-[13px] text-ink">
                        {isTransform ? (
                          <span>
                            <span className="font-semibold">{p.inputItem?.name ?? "—"}</span>
                            <span className="text-faint"> → </span>
                            <span className="font-semibold">{p.outputItem?.name ?? "—"}</span>
                          </span>
                        ) : (
                          <span className="font-semibold">{p.name}</span>
                        )}
                        {p.notes && <div className="mt-0.5 text-[11.5px] text-faint">{p.notes}</div>}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-[12.5px] text-text">
                        {isTransform ? (
                          <span>{kg(inKg)} <span className="text-faint">→</span> {kg(outKg)}</span>
                        ) : inKg > 0 ? (
                          kg(inKg)
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-[12.5px]">
                        {isTransform ? (
                          <span>
                            <span className="text-neg">{kg(Number(p.lossKg ?? 0))}</span>
                            <span className="text-faint"> · {yieldP}%</span>
                          </span>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3">
                        {isTransform ? (
                          <div className="flex flex-wrap gap-1">
                            {appliedTypes.map((ty) => (
                              <Chip key={ty} tone="neutral">{PROCESS_TYPE_LABELS[ty as ProcessType]}</Chip>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Chip tone="info">{t("processes.chip.legacy")}</Chip>
                            <StatusChip status={p.status === "in_progress" ? "in_transit" : p.status} label={p.status.replace(/_/g, " ")} />
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <CostChip
                          est={p.estimatedCost == null ? null : Number(p.estimatedCost)}
                          actual={p.actualCost == null ? null : Number(p.actualCost)}
                        />
                        {p.expenseEntry && (
                          <div className="mt-1 text-[10.5px] text-faint">{t("processes.cell.postedToExpenses")}</div>
                        )}
                      </td>
                      <td className="px-3.5 py-3">
                        {!isTransform && (
                          <ProcessRowActions
                            id={p.id}
                            status={p.status}
                            estimatedCost={p.estimatedCost == null ? null : Number(p.estimatedCost)}
                            canCancel={canCancel}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
