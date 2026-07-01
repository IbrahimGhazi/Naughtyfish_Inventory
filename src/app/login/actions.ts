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

const LoginSchema = z.object({
  loginId: z.string().min(1),
  password: z.string().min(1),
});

export type LoginState = { error: string | null };

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

  const user = await prisma.user.findUnique({
    where: { loginId: parsed.data.loginId },
  });
  const ok = user
    ? await bcrypt.compare(parsed.data.password, user.passwordHash)
    : false;

  if (!user || !ok) {
    return { error: "Invalid login ID or password." };
  }

  // Default active book: NF users start on NF, everyone else on C-Star.
  const defaultBook = user.entityAccess === "nf" ? "NF" : "C-Star";
  // Guard against an inconsistent grant by clamping to what's actually allowed.
  const allowed = allowedBookNames(user.entityAccess);
  const activeBook = allowed.includes(defaultBook) ? defaultBook : allowed[0];

  const token = signSession({ userId: user.id, entityName: activeBook });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);

  redirect("/");
}
