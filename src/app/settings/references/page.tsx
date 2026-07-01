import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import BackLink from "../BackLink";
import { Card } from "../ui";
import { AddSeriesForm, SeriesList, type SeriesRow } from "./SeriesControls";

export const dynamic = "force-dynamic";

export default async function ReferencesSettingsPage() {
  const ctx = await getActiveContext();
  const series = await prisma.referenceSeries.findMany({
    where: entityScope(ctx),
    orderBy: { bookRegion: "asc" },
  });

  const rows: SeriesRow[] = series.map((s) => ({
    id: s.id,
    prefix: s.prefix,
    bookRegion: s.bookRegion,
    currentNumber: s.currentNumber,
    digitWidth: s.digitWidth,
  }));

  return (
    <div className="space-y-6">
      <BackLink />
      <div>
        <h1 className="text-xl font-semibold">Reference series</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Per-book/region manual invoice numbering (one series per region). The{" "}
          <span className="font-medium">current number</span> is where the book
          stands now — invoicing bumps it by one and formats the preview shown.
        </p>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Existing series
        </h2>
        <SeriesList series={rows} />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Add series
        </h2>
        <AddSeriesForm />
      </Card>
    </div>
  );
}
