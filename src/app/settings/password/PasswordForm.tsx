"use client";

import { useActionState } from "react";
import { changeOwnPassword, type PasswordState } from "./actions";

const initial: PasswordState = { error: null, ok: false };

export default function PasswordForm() {
  const [state, formAction, isPending] = useActionState(changeOwnPassword, initial);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-muted">
          Current password
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
          New password <span className="font-normal text-faint">· min 6 characters</span>
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
          Confirm new password
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
          ✓ Password changed.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        data-testid="pw-submit"
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-[#F6F2E6] transition-colors disabled:opacity-40"
        style={{ background: "var(--accent)" }}
      >
        {isPending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
