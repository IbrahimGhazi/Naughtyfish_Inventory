"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { useCopy } from "@/lib/copy/CopyProvider";

const initialState: LoginState = { error: null };

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);
  const t = useCopy();

  return (
    <form action={formAction} className="space-y-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint2">
        {t("shell.login.eyebrow")}
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-muted">{t("shell.login.loginId")}</span>
        <input
          className="input"
          name="loginId"
          data-testid="login-id"
          autoComplete="username"
          autoFocus
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-muted">{t("shell.login.password")}</span>
        <input
          className="input"
          name="password"
          type="password"
          data-testid="login-password"
          autoComplete="current-password"
        />
      </label>

      {state.error && (
        <p className="text-sm text-neg" data-testid="login-error">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        data-testid="login-submit"
        className="w-full rounded-lg px-4 py-3 text-[14.5px] font-semibold text-on-accent transition-colors disabled:opacity-40"
        style={{ background: "var(--accent)" }}
      >
        {isPending ? t("shell.login.signingIn") : t("shell.login.submit")}
      </button>

      <div className="text-center text-[11.5px] text-faint">
        {t("shell.login.devHint")}
      </div>
    </form>
  );
}
