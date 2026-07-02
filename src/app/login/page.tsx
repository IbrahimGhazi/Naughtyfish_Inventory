import { redirect } from "next/navigation";
import { getOptionalContext } from "@/lib/session";
import { getAppConfig } from "@/lib/config";
import { roleHome } from "@/lib/roles";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Already signed in → straight to the ledger (delivery → its portal).
  const ctx = await getOptionalContext();
  if (ctx) redirect(roleHome(ctx.user.role));
  const { branding } = await getAppConfig();

  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center p-8"
      style={{
        backgroundColor: "var(--paper)",
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent 0px, transparent 33px, rgba(16,38,46,.045) 33px, rgba(16,38,46,.045) 34px), linear-gradient(90deg, transparent 0px, transparent 87px, rgba(194,73,47,.16) 87px, rgba(194,73,47,.16) 88px, transparent 88px)",
      }}
    >
      <div className="w-[420px] max-w-full animate-pop">
        <div className="mb-[26px] flex flex-col items-center">
          <div
            className="mb-3.5 flex h-[54px] w-[54px] items-center justify-center overflow-hidden rounded-full"
            style={{
              background: "var(--side-bg)",
              animation: "swim 3.2s ease-in-out infinite",
            }}
          >
            {branding.logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoDataUrl}
                alt={branding.appName}
                className="h-full w-full object-cover"
              />
            ) : (
              <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
                <path
                  d="M3.5 16c4.8-5.4 12-5.4 17.2-.8l5.1-3.5c.9-.6 2 .3 1.6 1.3L25.9 16l1.5 3c.4 1-.7 1.9-1.6 1.3l-5.1-3.5C15.5 21.4 8.3 21.4 3.5 16z"
                  fill="#F2EBD9"
                />
                <circle cx="8.4" cy="15.2" r="1.3" fill="#0D1F26" />
              </svg>
            )}
          </div>
          <div className="font-serif text-[34px] font-semibold italic tracking-[-0.01em] text-ink">
            {branding.appName}
          </div>
          <div className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-gold">
            {branding.tagline}
          </div>
        </div>

        <div
          className="rounded-[14px] border border-hair bg-card p-6"
          style={{ boxShadow: "0 18px 40px -18px rgba(22,38,46,.25)" }}
        >
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
