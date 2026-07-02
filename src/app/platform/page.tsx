import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { getAppConfig } from "@/lib/config";
import { PageHeader } from "@/components/ui";
import PlatformPanel from "./PlatformPanel";

export const dynamic = "force-dynamic";

/**
 * The product owner's white-label panel (platform_admin only). Everything a new
 * customer deployment needs to feel like *their* app: branding, theme,
 * business terminology and feature toggles — plus the runbook for standing up
 * a fresh customer on their own Supabase + Vercel accounts.
 */
export default async function PlatformPage() {
  const ctx = await getActiveContext();
  requirePage(ctx, "platform");
  const cfg = await getAppConfig();

  return (
    <div className="mx-auto max-w-[1100px] animate-rise px-8 pb-14 pt-7">
      <PageHeader
        eyebrow="Product owner"
        title="Platform"
        subtitle={
          <>
            Customize this deployment for the customer — branding, theme, business
            terminology and modules. This panel (and your login) is invisible to
            every client role.
          </>
        }
      />
      <PlatformPanel initial={cfg} />
    </div>
  );
}
