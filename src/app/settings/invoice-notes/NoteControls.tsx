"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Chip } from "@/components/ui";
import { useCopy } from "@/lib/copy/CopyProvider";
import {
  createInvoiceNote,
  updateInvoiceNote,
  deleteInvoiceNote,
} from "../actions";

export interface NoteRow {
  id: string;
  text: string;
  isDefault: boolean;
}

/** Add a new reusable invoice note. */
export function AddNoteForm() {
  const t = useCopy();
  const router = useRouter();
  const [text, setText] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    start(async () => {
      try {
        await createInvoiceNote({ text, isDefault });
        setText("");
        setIsDefault(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save the note.");
      }
    });
  }

  return (
    <Card className="p-[18px]">
      <h2 className="mb-2 font-serif text-[17px] font-semibold text-ink">
        {t("settings.notes.addTitle")}
      </h2>
      <textarea
        className="input min-h-[72px] resize-y"
        data-testid="note-add-text"
        placeholder={t("settings.notes.placeholder")}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          data-testid="note-add-default"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="h-4 w-4 rounded border-hair2"
        />
        <span className="text-text">{t("settings.notes.makeDefault")}</span>
      </label>
      {error && (
        <p className="mt-2 text-sm text-neg" data-testid="note-add-error">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={isPending || !text.trim()}
        data-testid="note-add-submit"
        className="mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
        style={{ background: "var(--accent)" }}
      >
        {isPending ? t("settings.notes.saving") : t("settings.notes.add")}
      </button>
    </Card>
  );
}

/** One saved note — editable text, default toggle, delete. */
export function NoteRowControls({ note }: { note: NoteRow }) {
  const t = useCopy();
  const router = useRouter();
  const [text, setText] = useState(note.text);
  const [isDefault, setIsDefault] = useState(note.isDefault);
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dirty = text !== note.text || isDefault !== note.isDefault;

  function save() {
    setError(null);
    start(async () => {
      try {
        await updateInvoiceNote({ id: note.id, text, isDefault });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  }

  function remove() {
    setError(null);
    start(async () => {
      try {
        await deleteInvoiceNote({ id: note.id });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not delete.");
      }
    });
  }

  return (
    <Card className="p-4" data-testid={`note-row-${note.id}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        {note.isDefault ? (
          <Chip tone="pos">{t("settings.notes.defaultChip")}</Chip>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={remove}
          disabled={isPending}
          data-testid={`note-del-${note.id}`}
          className="text-xs font-semibold text-neg disabled:opacity-40"
        >
          {t("settings.notes.delete")}
        </button>
      </div>
      <textarea
        className="input min-h-[64px] resize-y"
        data-testid={`note-text-${note.id}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          data-testid={`note-default-${note.id}`}
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="h-4 w-4 rounded border-hair2"
        />
        <span className="text-text">{t("settings.notes.makeDefault")}</span>
      </label>
      {error && <p className="mt-2 text-sm text-neg">{error}</p>}
      {dirty && (
        <button
          type="button"
          onClick={save}
          disabled={isPending || !text.trim()}
          data-testid={`note-save-${note.id}`}
          className="mt-3 inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? t("settings.notes.saving") : t("settings.notes.save")}
        </button>
      )}
    </Card>
  );
}
