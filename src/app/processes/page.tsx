import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage, OFFICE_ROLES } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { getAppConfig, getCopy } from "@/lib/config";
import { pkr, kg, dateShort } from "@/lib/format";
import { PageHeader, Card, Kpi, StatusChip, Th } from "@/components/ui";
import { NewProcessForm, ProcessRowActions, CostChip } from "./ProcessControls";

export const dynamic = "force-dynamic";

/**
 * OPTIONAL processing tracker: raw material sent out for work (cutting,
 * freezing, dyeing, …) with expected turnaround + cost. Nothing else in the
 * app depends on it — the module can be switched off per customer in /platform.
 */
export default async function ProcessesPage() {
  const ctx = await getActiveContext();
  requirePage(ctx, "processes");
  const cfg = await getAppConfig();
  const t = await getCopy();
  if (!cfg.features.processes) redirect("/");
  const scope = entityScope(ctx);

  const [processes, items, stores] = await Promise.all([
    prisma.process.findMany({
      where: scope,
      include: {
        item: { select: { name: true } },
        fromStore: { select: { name: true } },
        expenseEntry: { select: { id: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.item.findMany({ where: { ...scope, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.store.findMany({ where: scope, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const now = new Date();
  const active = processes.filter((p) => p.status === "planned" || p.status === "in_progress");
  const overdue = active.filter(
    (p) => p.expectedReadyAt && new Date(p.expectedReadyAt).getTime() < now.getTime(),
  );
  const pipelineEst = active.reduce((s, p) => s + Number(p.estimatedCost ?? 0), 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const spentThisMonth = processes
    .filter((p) => p.status === "completed" && p.completedAt && new Date(p.completedAt) >= monthStart)
    .reduce((s, p) => s + Number(p.actualCost ?? 0), 0);

  const canCancel = OFFICE_ROLES.includes(ctx.user.role);

  return (
    <div className="animate-rise space-y-4">
      <PageHeader
        eyebrow={t("processes.eyebrow")}
        title={t("processes.title")}
        subtitle={t("processes.subtitle")}
        action={
          <NewProcessForm
            items={items}
            stores={stores}
            weightUnit={cfg.terminology.weightUnit}
            canCancel={canCancel}
          />
        }
      />

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <Kpi label={t("processes.kpi.active")} value={String(active.length)} sub={t("processes.kpi.activeSub")} />
        <Kpi
          label={t("processes.kpi.overdue")}
          value={String(overdue.length)}
          sub={t("processes.kpi.overdueSub")}
          valueColor={overdue.length > 0 ? "var(--neg)" : undefined}
        />
        <Kpi label={t("processes.kpi.pipeline")} value={pkr(pipelineEst)} sub={t("processes.kpi.pipelineSub")} />
        <Kpi label={t("processes.kpi.spent")} value={pkr(spentThisMonth)} sub={t("processes.kpi.spentSub")} />
      </div>

      {processes.length === 0 ? (
        <Card className="p-8 text-center text-[13.5px] text-faint">
          {t("processes.empty.line1")}
          <br />
          {t("processes.empty.line2")}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>{t("processes.col.process")}</Th>
                <Th>{t("processes.col.where")}</Th>
                <Th>{t("processes.col.material")}</Th>
                <Th>{t("processes.col.expectedReady")}</Th>
                <Th>{t("processes.col.status")}</Th>
                <Th align="right">{t("processes.col.cost")}</Th>
                <Th align="right" className="w-[240px]"></Th>
              </tr>
            </thead>
            <tbody>
              {processes.map((p) => {
                const isActive = p.status === "planned" || p.status === "in_progress";
                const isLate =
                  isActive && p.expectedReadyAt && new Date(p.expectedReadyAt).getTime() < now.getTime();
                return (
                  <tr key={p.id} className="border-b border-row align-top transition-colors hover:bg-card2">
                    <td className="px-3.5 py-3">
                      <div className="text-[13.5px] font-semibold text-ink">{p.name}</div>
                      {p.notes && <div className="mt-0.5 text-[11.5px] text-faint">{p.notes}</div>}
                    </td>
                    <td className="px-3.5 py-3 text-[13px] text-text">
                      {p.destination}
                      {p.fromStore && (
                        <div className="text-[11.5px] text-faint">{t("processes.cell.from")} {p.fromStore.name}</div>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-[13px] text-text">
                      {p.item?.name ?? p.materialNote ?? "—"}
                      {p.quantityKg != null && (
                        <div className="font-mono text-[11.5px] text-muted">{kg(Number(p.quantityKg))}</div>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-[13px]">
                      {p.expectedReadyAt ? (
                        <span className={isLate ? "font-semibold text-neg" : "text-text"}>
                          {dateShort(p.expectedReadyAt)}
                          {isLate ? t("processes.cell.late") : ""}
                        </span>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                      {p.completedAt && (
                        <div className="text-[11.5px] text-faint">{t("processes.cell.done")} {dateShort(p.completedAt)}</div>
                      )}
                    </td>
                    <td className="px-3.5 py-3">
                      <StatusChip status={p.status === "in_progress" ? "in_transit" : p.status}
                        label={p.status.replace(/_/g, " ")} />
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
                      <ProcessRowActions
                        id={p.id}
                        status={p.status}
                        estimatedCost={p.estimatedCost == null ? null : Number(p.estimatedCost)}
                        canCancel={canCancel}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
