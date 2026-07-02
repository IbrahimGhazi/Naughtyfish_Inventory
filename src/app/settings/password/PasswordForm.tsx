"use client";

import { useActionState } from "react";
import { changeOwnPassword, type PasswordState } from "./actions";
import { useCopy } from "@/lib/copy/CopyProvider";

const initial: PasswordState = { error: null, ok: false };

export default function PasswordForm() {
  const t = useCopy();
  const [state, formAction, isPending] = useActionState(changeOwnPassword, initial);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-muted">
          {t("settings.password.currentLabel")}
        </span>
        <input
          className="input"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          data-testid="pw-current"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-muted">
          {t("settings.password.newLabel")}{" "}
          <span className="font-normal text-faint">· {t("settings.password.newHint")}</span>
        </span>
        <input
          className="input"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          data-testid="pw-new"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-muted">
          {t("settings.password.confirmLabel")}
        </span>
        <input
          className="input"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          data-testid="pw-confirm"
        />
      </label>

      {state.error && (
        <p className="text-sm text-neg" data-testid="pw-error">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm font-medium text-pos" data-testid="pw-ok">
          {t("settings.password.ok")}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        data-testid="pw-submit"
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
        style={{ background: "var(--accent)" }}
      >
        {isPending ? t("settings.password.saving") : t("settings.password.submit")}
      </button>
    </form>
  );
}
