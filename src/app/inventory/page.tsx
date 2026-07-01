import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope, storeScope } from "@/lib/scope";
import { kg } from "@/lib/format";
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

  const formStores: AdjFormStore[] = stores.map((s) => ({ id: s.id, name: s.name }));
  const formItems: AdjFormItem[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    isPrawn: i.isPrawn,
    cartonWeightKg: Number(i.cartonWeightKg),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Inventory</h1>

      {/* Grand-total banner across visible stores. */}
      <div
        data-testid="inv-grand-total"
        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-900 dark:bg-cyan-950"
      >
        <span className="text-sm font-medium text-cyan-800 dark:text-cyan-300">
          Grand total · {stores.length} store{stores.length === 1 ? "" : "s"}
        </span>
        <span className="text-sm text-cyan-800 dark:text-cyan-300">
          <span className="font-semibold">{grandTotalCartons}</span> cartons ·{" "}
          <span className="font-semibold">{kg(grandTotalKg)}</span>
        </span>
      </div>

      {stores.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">No stores in your scope.</p>
      ) : (
        stores.map((store) => {
          const storeKg = store.inventoryLines.reduce((t, l) => t + Number(l.totalKg), 0);
          const storeCartons = store.inventoryLines.reduce((t, l) => t + l.cartonCount, 0);
          const storePackets = store.inventoryLines.reduce((t, l) => t + l.packetCount, 0);
          return (
            <section
              key={store.id}
              data-testid={`inv-store-${store.id}`}
              className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {store.name}
                  {store.city ? <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">· {store.city}</span> : null}
                </h2>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {store.ownershipType}
                </span>
              </div>

              {store.inventoryLines.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">No stock recorded.</p>
              ) : (
                <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400 dark:bg-slate-800/50 dark:text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2 text-right">Cartons</th>
                        <th className="px-3 py-2 text-right">Packets</th>
                        <th className="px-3 py-2 text-right">Kg / carton</th>
                        <th className="px-3 py-2 text-right">Total kg</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {store.inventoryLines.map((line) => (
                        <tr key={line.id}>
                          <td className="px-3 py-2">
                            {line.item.name}
                            {line.item.isPrawn ? " 🦐" : ""}
                          </td>
                          <td className={`px-3 py-2 text-right ${line.cartonCount < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                            {line.cartonCount}
                          </td>
                          <td className={`px-3 py-2 text-right ${line.packetCount < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                            {line.packetCount}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-500 dark:text-slate-400">
                            {kg(Number(line.kgPerCarton))}
                          </td>
                          <td className={`px-3 py-2 text-right font-medium ${Number(line.totalKg) < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                            {kg(Number(line.totalKg))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-slate-200 bg-slate-50 text-sm font-semibold dark:border-slate-800 dark:bg-slate-800/50">
                      <tr>
                        <td className="px-3 py-2">Store total</td>
                        <td className={`px-3 py-2 text-right ${storeCartons < 0 ? "text-red-600 dark:text-red-400" : ""}`}>{storeCartons}</td>
                        <td className={`px-3 py-2 text-right ${storePackets < 0 ? "text-red-600 dark:text-red-400" : ""}`}>{storePackets}</td>
                        <td className="px-3 py-2 text-right text-slate-400 dark:text-slate-500">—</td>
                        <td className={`px-3 py-2 text-right ${storeKg < 0 ? "text-red-600 dark:text-red-400" : ""}`}>{kg(storeKg)}</td>
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
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Receive / adjust stock</h2>
        <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
          Adds to the store&apos;s on-hand and records a stock movement. Negative values are
          allowed for real-world corrections.
        </p>
        <StockAdjustForm stores={formStores} items={formItems} />
      </section>
    </div>
  );
}
