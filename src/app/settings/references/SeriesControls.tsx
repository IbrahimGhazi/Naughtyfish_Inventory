"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReferenceSeries, updateReferenceSeries } from "../actions";
import { Field, EditToggle } from "../ui";
import { nextReferencePreview } from "./preview";

export interface SeriesRow {
  id: string;
  prefix: string;
  bookRegion: string;
  currentNumber: number;
  digitWidth: number;
}

interface SeriesValues {
  prefix: string;
  bookRegion: string;
  currentNumber: string;
  digitWidth: string;
}

function toPayload(v: SeriesValues) {
  return {
    prefix: v.prefix.trim(),
    bookRegion: v.bookRegion.trim(),
    currentNumber: Number(v.currentNumber || 0),
    digitWidth: Number(v.digitWidth || 6),
  };
}

/** Live preview of the next reference the series will emit. */
function Preview({ v }: { v: SeriesValues }) {
  const preview = nextReferencePreview(
    v.prefix || "",
    Number(v.currentNumber || 0),
    Number(v.digitWidth || 1),
  );
  return (
    <div className="rounded-lg border border-hair2 bg-card2 px-3 py-2 text-sm">
      <span className="text-muted">Next number: </span>
      <span className="font-mono font-medium text-gold" data-testid="series-preview">
        {preview}
      </span>
    </div>
  );
}

function SeriesFields({
  v,
  set,
  idPrefix,
}: {
  v: SeriesValues;
  set: (patch: Partial<SeriesValues>) => void;
  idPrefix: string;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Field label="Prefix" hint="e.g. SSI-">
          <input
            className="input"
            data-testid={`${idPrefix}-prefix`}
            value={v.prefix}
            onChange={(e) => set({ prefix: e.target.value })}
          />
        </Field>
        <Field label="Book / region" hint="e.g. Karachi">
          <input
            className="input"
            data-testid={`${idPrefix}-region`}
            value={v.bookRegion}
            onChange={(e) => set({ bookRegion: e.target.value })}
          />
        </Field>
        <Field label="Current number">
          <input
            className="input"
            data-testid={`${idPrefix}-current`}
            inputMode="numeric"
            value={v.currentNumber}
            onChange={(e) => set({ currentNumber: e.target.value })}
          />
        </Field>
        <Field label="Digit width">
          <input
            className="input"
            data-testid={`${idPrefix}-width`}
            inputMode="numeric"
            value={v.digitWidth}
            onChange={(e) => set({ digitWidth: e.target.value })}
          />
        </Field>
      </div>
      <Preview v={v} />
    </div>
  );
}

const EMPTY: SeriesValues = {
  prefix: "SSI-",
  bookRegion: "",
  currentNumber: "0",
  digitWidth: "6",
};

export function AddSeriesForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [v, setV] = useState<SeriesValues>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const set = (patch: Partial<SeriesValues>) => setV((prev) => ({ ...prev, ...patch }));
  const canSubmit = !!v.prefix.trim() && !!v.bookRegion.trim() && !isPending;

  function submit() {
    setError(null);
    setOk(false);
    startTransition(async () => {
      try {
        await createReferenceSeries(toPayload(v));
        setV(EMPTY);
        setOk(true);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <SeriesFields v={v} set={set} idPrefix="series-add" />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          data-testid="series-add-submit"
          className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? "Adding…" : "+ Add series"}
        </button>
        {ok && <span className="text-xs font-medium text-pos">✓ Saved.</span>}
        {error && <span className="text-xs text-neg">{error}</span>}
      </div>
    </div>
  );
}

function EditSeriesForm({ series, onDone }: { series: SeriesRow; onDone: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [v, setV] = useState<SeriesValues>({
    prefix: series.prefix,
    bookRegion: series.bookRegion,
    currentNumber: String(series.currentNumber),
    digitWidth: String(series.digitWidth),
  });
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<SeriesValues>) => setV((prev) => ({ ...prev, ...patch }));
  const canSubmit = !!v.prefix.trim() && !!v.bookRegion.trim() && !isPending;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await updateReferenceSeries({ id: series.id, ...toPayload(v) });
        router.refresh();
        onDone();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <SeriesFields v={v} set={set} idPrefix={`series-edit-${series.id}`} />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          data-testid={`series-edit-save-${series.id}`}
          className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        {error && <span className="text-xs text-neg">{error}</span>}
      </div>
    </div>
  );
}

export function SeriesList({ series }: { series: SeriesRow[] }) {
  if (series.length === 0) {
    return (
      <p className="text-sm text-faint">No reference series yet — add one below.</p>
    );
  }
  return (
    <ul className="divide-y divide-row">
      {series.map((s) => (
        <li key={s.id} data-testid={`series-row-${s.id}`}>
          <EditToggle
            testId={`series-${s.id}`}
            summary={
              <div>
                <div className="font-medium text-ink">{s.bookRegion}</div>
                <div className="text-xs text-faint">
                  next{" "}
                  <span className="font-mono text-gold">
                    {nextReferencePreview(s.prefix, s.currentNumber, s.digitWidth)}
                  </span>{" "}
                  · at <span className="font-mono">{s.currentNumber}</span>
                </div>
              </div>
            }
          >
            {(close) => <EditSeriesForm series={s} onDone={close} />}
          </EditToggle>
        </li>
      ))}
    </ul>
  );
}
