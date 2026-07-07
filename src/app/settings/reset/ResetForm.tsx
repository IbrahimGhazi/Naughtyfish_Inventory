"use client";

import { useActionState } from "react";
import { resetAllData, type ResetState } from "./actions";
import { useCopy } from "@/lib/copy/CopyProvider";

const initial: ResetState = { error: null, ok: false };

/**
 * Danger-zone reset form. The submit button stays disabled until the owner types
 * the exact book name — a deliberate speed bump for an irreversible action. The
 * server re-checks the same name, so this is UX, not the real guard.
 */
export default function ResetForm({ entityName }: { entityName: string }) {
  const t = useCopy();
  const [state, formAction, isPending] = useActionState(resetAllData, initial);

  if (state.ok) {
    return (
      <div data-testid="reset-done" className="space-y-3">
        <p className="text-sm font-semibold text-pos">
          {t("settings.reset.done").replace("{n}", String(state.total ?? 0))}
        </p>
        {state.summary && (
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] text-muted">
            {Object.entries(state.summary)
              .filter(([, n]) => n > 0)
              .map(([k, n]) => (
                <li key={k} className="flex justify-between">
                  <span>{k}</span>
                  <span className="font-mono text-text">{n}</span>
                </li>
              ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-muted">
          {t("settings.reset.confirmLabel").replace("{name}", entityName)}
        </span>
        <input
          className="input"
          name="confirmName"
          autoComplete="off"
          placeholder={entityName}
          data-testid="reset-confirm"
        />
      </label>

      {state.error && (
        <p className="text-sm text-neg" data-testid="reset-error">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        data-testid="reset-submit"
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-40"
        style={{ background: "var(--neg, #c0392b)" }}
      >
        {isPending ? t("settings.reset.working") : t("settings.reset.submit")}
      </button>
    </form>
  );
}
