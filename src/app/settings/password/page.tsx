import Link from "next/link";
import { getActiveContext } from "@/lib/session";
import PasswordForm from "./PasswordForm";

export const dynamic = "force-dynamic";

export default async function PasswordPage() {
  const ctx = await getActiveContext();

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <Link href="/settings" className="text-xs text-slate-400 hover:text-cyan-700 dark:text-slate-500 dark:hover:text-cyan-400">
          ← Settings
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Change password</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Signed in as <strong>{ctx.user.name}</strong>. Changing your password does not log out
          other devices (rotate the server secret for that).
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <PasswordForm />
      </div>
    </div>
  );
}
