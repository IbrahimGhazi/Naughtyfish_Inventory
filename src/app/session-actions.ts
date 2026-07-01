"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  signSession,
} from "@/lib/auth";
import { allowedBookNames, getActiveContext } from "@/lib/session";

/** Switch the active book, validating it against the user's grant. */
export async function switchBook(entityName: string): Promise<void> {
  const ctx = await getActiveContext();
  const allowed = allowedBookNames(ctx.user.entityAccess);
  if (!allowed.includes(entityName)) {
    throw new Error("Forbidden: user lacks access to this book.");
  }

  const token = signSession({ userId: ctx.user.id, entityName });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);

  revalidatePath("/", "layout");
}

/** Clear the session cookie and return to the login screen. */
export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
