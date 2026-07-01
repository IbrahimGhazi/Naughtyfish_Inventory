import { redirect } from "next/navigation";
import { getOptionalContext } from "@/lib/session";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Already signed in → straight to the ledger.
  const ctx = await getOptionalContext();
  if (ctx) redirect("/");

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center">
      <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="mb-1 text-center text-lg font-semibold tracking-tight text-cyan-700 dark:text-cyan-400">
          🐟 NaughtyFish
        </h1>
        <p className="mb-5 text-center text-xs text-slate-400 dark:text-slate-500">
          Sign in to open the ledger
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
