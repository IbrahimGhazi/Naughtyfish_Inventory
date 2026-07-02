import { BackLink as SharedBackLink } from "@/components/ui";
import { getCopy } from "@/lib/config";

/** Consistent "← Settings" back-link for every settings sub-page. */
export default async function BackLink() {
  const t = await getCopy();
  return <SharedBackLink href="/settings">{t("settings.backLink")}</SharedBackLink>;
}
