import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import BackLink from "../BackLink";
import { Card } from "../ui";
import { PageHeader } from "@/components/ui";
import { AddSeriesForm, SeriesList, type SeriesRow } from "./SeriesControls";

export const dynamic = "force-dynamic";

export default async function ReferencesSettingsPage() {
  const ctx = await getActiveContext();
  requirePage(ctx, "settings");
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
    <div className="mx-auto max-w-[1000px] animate-rise px-8 pb-14 pt-7">
      <BackLink />
      <PageHeader
        eyebrow="Admin"
        title="Reference series"
        subtitle={
          <>
            Per-book/region manual invoice numbering (one series per region). The{" "}
            <span className="font-medium text-text">current number</span> is where the book
            stands now — invoicing bumps it by one and formats the preview shown.
          </>
        }
      />

      <div className="space-y-4">
        <Card>
          <h2 className="mb-3 font-serif text-[17px] font-semibold text-ink">
            Existing series
          </h2>
          <SeriesList series={rows} />
        </Card>

        <Card>
          <h2 className="mb-3 font-serif text-[17px] font-semibold text-ink">
            Add series
          </h2>
          <AddSeriesForm />
        </Card>
      </div>
    </div>
  );
}
