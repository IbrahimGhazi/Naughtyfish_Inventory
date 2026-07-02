import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { getAppConfig, getCopy } from "@/lib/config";
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
  const t = await getCopy();

  return (
    <div className="mx-auto max-w-[1100px] animate-rise px-8 pb-14 pt-7">
      <PageHeader
        eyebrow={t("platform.eyebrow")}
        title={t("platform.title")}
        subtitle={<>{t("platform.subtitle")}</>}
      />
      <PlatformPanel initial={cfg} />
    </div>
  );
}
