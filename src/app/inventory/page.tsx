import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope, storeScope } from "@/lib/scope";
import { kg } from "@/lib/format";
import { Card, Chip, PageHeader, Th } from "@/components/ui";
import StockAdjustForm, { type AdjFormStore, type AdjFormItem } from "./StockAdjustForm";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const ctx = await getActiveContext();

  // storeScope → store-scoped users see only their store(s); admin/accountant see all.
  const stores = await prisma.store.findMany({
    where: storeScope(ctx),
    orderBy: { name: "asc" },
    include: {
      inventoryLines: {
        include: { item: true },
        orderBy: { item: { name: "asc" } },
      },
    },
  });

  const items = await prisma.item.findMany({
    where: { ...entityScope(ctx), active: true },
    orderBy: { name: "asc" },
  });

  // Grand total across the VISIBLE stores only.
  const grandTotalKg = stores.reduce(
    (sum, s) => sum + s.inventoryLines.reduce((t, l) => t + Number(l.totalKg), 0),
    0,
  );
  const grandTotalCartons = stores.reduce(
    (sum, s) => sum + s.inventoryLines.reduce((t, l) => t + l.cartonCount, 0),
    0,
  );

  // Largest single line (by total kg) → the "Level" mini-bar is filled relative to it.
  const maxLineKg = Math.max(
    1,
    ...stores.flatMap((s) => s.inventoryLines.map((l) => Number(l.totalKg))),
  );

  const formStores: AdjFormStore[] = stores.map((s) => ({ id: s.id, name: s.name }));
  const formItems: AdjFormItem[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    isPrawn: i.isPrawn,
    cartonWeightKg: Number(i.cartonWeightKg),
  }));

  return (
    <div className="animate-rise space-y-5">
      <PageHeader eyebrow="Operations" title="Inventory" />

      {/* Grand-total banner across visible stores. */}
      <div
        data-testid="inv-grand-total"
        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-hair px-4 py-3"
        style={{ background: "var(--warn-bg)", color: "var(--warn)" }}
      >
        <span className="flex items-center gap-2 text-[12.5px] font-semibold">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: "var(--warn)" }}
          />
          Grand total · {stores.length} store{stores.length === 1 ? "" : "s"}
        </span>
        <span className="text-[12.5px]">
          <span className="font-mono font-semibold">{grandTotalCartons}</span> cartons ·{" "}
          <span className="font-mono font-semibold">{kg(grandTotalKg)}</span>
        </span>
      </div>

      {stores.length === 0 ? (
        <p className="text-sm text-faint">No stores in your scope.</p>
      ) : (
        stores.map((store) => {
          const storeKg = store.inventoryLines.reduce((t, l) => t + Number(l.totalKg), 0);
          const storeCartons = store.inventoryLines.reduce((t, l) => t + l.cartonCount, 0);
          const storePackets = store.inventoryLines.reduce((t, l) => t + l.packetCount, 0);
          return (
            <section
              key={store.id}
              data-testid={`inv-store-${store.id}`}
              className="overflow-hidden rounded-xl border border-hair bg-card"
            >
              <div className="flex items-center justify-between border-b border-hair2 bg-card2 px-4 py-3.5">
                <h2 className="font-serif text-[16px] font-semibold text-ink">
                  {store.name}
                  {store.city ? (
                    <span className="ml-1.5 font-sans text-[12.5px] font-normal text-muted">
                      · {store.city}
                    </span>
                  ) : null}
                </h2>
                <Chip tone="neutral" className="uppercase">
                  {store.ownershipType}
                </Chip>
              </div>

              {store.inventoryLines.length === 0 ? (
                <p className="px-4 py-6 text-sm text-faint">No stock recorded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <Th>Item</Th>
                        <Th className="w-[240px]">Level</Th>
                        <Th align="right">Cartons</Th>
                        <Th align="right">Packets</Th>
                        <Th align="right">Kg / carton</Th>
                        <Th align="right">Net weight</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {store.inventoryLines.map((line) => {
                        const lineKg = Number(line.totalKg);
                        const pctFill = Math.max(
                          0,
                          Math.min(100, (lineKg / maxLineKg) * 100),
                        );
                        return (
                          <tr key={line.id} className="border-b border-row hover:bg-card2">
                            <td className="px-3.5 py-3 text-[13px] font-semibold text-text">
                              {line.item.name}
                              {line.item.isPrawn ? " 🦐" : ""}
                            </td>
                            <td className="px-3.5 py-3">
                              <div className="h-1.5 overflow-hidden rounded-full bg-row">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${pctFill}%`,
                                    background:
                                      lineKg < 0 ? "var(--neg)" : "var(--accent)",
                                  }}
                                />
                              </div>
                            </td>
                            <td
                              className={`px-3.5 py-3 text-right font-mono text-[13px] ${
                                line.cartonCount < 0 ? "text-neg" : "text-text"
                              }`}
                            >
                              {line.cartonCount}
                            </td>
                            <td
                              className={`px-3.5 py-3 text-right font-mono text-[13px] ${
                                line.packetCount < 0 ? "text-neg" : "text-text"
                              }`}
                            >
                              {line.packetCount}
                            </td>
                            <td className="px-3.5 py-3 text-right font-mono text-[13px] text-muted">
                              {kg(Number(line.kgPerCarton))}
                            </td>
                            <td
                              className={`px-3.5 py-3 text-right font-mono text-[13px] font-semibold ${
                                lineKg < 0 ? "text-neg" : "text-text"
                              }`}
                            >
                              {kg(lineKg)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-hair2 bg-card2 text-[13px] font-semibold">
                        <td className="px-3.5 py-3 text-text">Store total</td>
                        <td className="px-3.5 py-3" />
                        <td
                          className={`px-3.5 py-3 text-right font-mono ${
                            storeCartons < 0 ? "text-neg" : "text-text"
                          }`}
                        >
                          {storeCartons}
                        </td>
                        <td
                          className={`px-3.5 py-3 text-right font-mono ${
                            storePackets < 0 ? "text-neg" : "text-text"
                          }`}
                        >
                          {storePackets}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono text-faint">—</td>
                        <td
                          className={`px-3.5 py-3 text-right font-mono ${
                            storeKg < 0 ? "text-neg" : "text-text"
                          }`}
                        >
                          {kg(storeKg)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>
          );
        })
      )}

      {/* Receive / adjust stock. */}
      <Card className="p-[18px]">
        <h2 className="mb-1 font-serif text-[17px] font-semibold text-ink">
          Receive / adjust stock
        </h2>
        <p className="mb-3 text-[12.5px] text-muted">
          Adds to the store&apos;s on-hand and records a stock movement. Negative values are
          allowed for real-world corrections.
        </p>
        <StockAdjustForm stores={formStores} items={formItems} />
      </Card>
    </div>
  );
}
