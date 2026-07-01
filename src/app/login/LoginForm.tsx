"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Login ID</span>
        <input
          className="input"
          name="loginId"
          data-testid="login-id"
          autoComplete="username"
          autoFocus
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Password</span>
        <input
          className="input"
          name="password"
          type="password"
          data-testid="login-password"
          autoComplete="current-password"
        />
      </label>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400" data-testid="login-error">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        data-testid="login-submit"
        className="w-full rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800 disabled:opacity-40"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
