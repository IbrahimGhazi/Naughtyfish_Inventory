import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { getCopy } from "@/lib/config";
import { PageHeader, BackLink } from "@/components/ui";
import { AddNoteForm, NoteRowControls, type NoteRow } from "./NoteControls";

export const dynamic = "force-dynamic";

/**
 * Manage the per-book invoice-notes library — a handful of reusable notes the
 * office picks from when billing, one optionally marked default.
 */
export default async function InvoiceNotesPage() {
  const ctx = await getActiveContext();
  requirePage(ctx, "settings");
  const t = await getCopy();

  const notes = await prisma.invoiceNote.findMany({
    where: entityScope(ctx),
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, text: true, isDefault: true },
  });
  const rows: NoteRow[] = notes;

  return (
    <div className="mx-auto max-w-lg animate-rise space-y-4">
      <BackLink href="/settings">{t("settings.backLink")}</BackLink>
      <PageHeader
        eyebrow={t("settings.notes.eyebrow")}
        title={t("settings.notes.title")}
        subtitle={t("settings.notes.subtitle")}
      />

      <AddNoteForm />

      {rows.length === 0 ? (
        <p className="text-sm text-muted" data-testid="notes-empty">
          {t("settings.notes.empty")}
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((n) => (
            <NoteRowControls key={n.id} note={n} />
          ))}
        </div>
      )}
    </div>
  );
}
