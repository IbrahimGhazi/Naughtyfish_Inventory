"use client";

import { useActionState } from "react";
import { changeOwnPassword, type PasswordState } from "./actions";

const initial: PasswordState = { error: null, ok: false };

export default function PasswordForm() {
  const [state, formAction, isPending] = useActionState(changeOwnPassword, initial);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
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
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
          New password <span className="font-normal text-slate-400 dark:text-slate-500">· min 6 characters</span>
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
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
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
        <p className="text-sm text-red-600 dark:text-red-400" data-testid="pw-error">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400" data-testid="pw-ok">
          ✓ Password changed.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        data-testid="pw-submit"
        className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800 disabled:opacity-40"
      >
        {isPending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
