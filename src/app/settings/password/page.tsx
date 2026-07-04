import { getActiveContext } from "@/lib/session";
import { getCopy } from "@/lib/config";
import { PageHeader, Card, BackLink } from "@/components/ui";
import PasswordForm from "./PasswordForm";

export const dynamic = "force-dynamic";

export default async function PasswordPage() {
  const ctx = await getActiveContext();
  const t = await getCopy();

  return (
    <div className="mx-auto max-w-md animate-rise">
      <BackLink href="/settings">{t("settings.backLink")}</BackLink>
      <PageHeader
        eyebrow={t("settings.password.eyebrow")}
        title={t("settings.password.title")}
        subtitle={
          <>
            {t("settings.password.subtitle.prefix")}
            <strong className="font-semibold text-text">{ctx.user.name}</strong>
            {t("settings.password.subtitle.suffix")}
          </>
        }
      />
      <Card className="p-[18px]">
        <PasswordForm />
      </Card>
    </div>
  );
}
