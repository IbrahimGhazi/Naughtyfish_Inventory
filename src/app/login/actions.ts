"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  signSession,
} from "@/lib/auth";
import { allowedBookNames } from "@/lib/session";
import { roleHome } from "@/lib/roles";

const LoginSchema = z.object({
  loginId: z.string().min(1),
  password: z.string().min(1),
});

export type LoginState = { error: string | null };

/**
 * In-memory brute-force throttle per loginId: 5 failures → 15-minute lockout.
 * Process-local (fine for the single-instance deployment this app targets);
 * restarting the server clears it, which is an acceptable trade for zero deps.
 */
const FAIL_LIMIT = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; lockedUntil: number }>();

function throttled(loginId: string): number {
  const f = failures.get(loginId);
  if (!f) return 0;
  const remaining = f.lockedUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

function recordFailure(loginId: string): void {
  const f = failures.get(loginId) ?? { count: 0, lockedUntil: 0 };
  f.count += 1;
  if (f.count >= FAIL_LIMIT) {
    f.lockedUntil = Date.now() + LOCKOUT_MS;
    f.count = 0;
  }
  failures.set(loginId, f);
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    loginId: formData.get("loginId"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter your login ID and password." };
  }

  const lockMs = throttled(parsed.data.loginId);
  if (lockMs > 0) {
    const mins = Math.ceil(lockMs / 60000);
    return { error: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` };
  }

  const user = await prisma.user.findUnique({
    where: { loginId: parsed.data.loginId },
  });
  const ok = user
    ? await bcrypt.compare(parsed.data.password, user.passwordHash)
    : false;

  if (!user || !ok) {
    recordFailure(parsed.data.loginId);
    return { error: "Invalid login ID or password." };
  }
  failures.delete(parsed.data.loginId);

  // Default active book: NF users start on NF, everyone else on C-Star.
  const defaultBook = user.entityAccess === "nf" ? "NF" : "C-Star";
  // Guard against an inconsistent grant by clamping to what's actually allowed.
  const allowed = allowedBookNames(user.entityAccess);
  const activeBook = allowed.includes(defaultBook) ? defaultBook : allowed[0];

  const token = signSession({ userId: user.id, entityName: activeBook });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);

  redirect(roleHome(user.role));
}
