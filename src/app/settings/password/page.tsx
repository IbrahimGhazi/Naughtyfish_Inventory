import { getActiveContext } from "@/lib/session";
import { PageHeader, Card, BackLink } from "@/components/ui";
import PasswordForm from "./PasswordForm";

export const dynamic = "force-dynamic";

export default async function PasswordPage() {
  const ctx = await getActiveContext();

  return (
    <div className="mx-auto max-w-md animate-rise px-8 pb-14 pt-7">
      <BackLink href="/settings">← Settings</BackLink>
      <PageHeader
        eyebrow="Admin"
        title="Change password"
        subtitle={
          <>
            Signed in as <strong className="font-semibold text-text">{ctx.user.name}</strong>.
            Changing your password does not log out other devices (rotate the server
            secret for that).
          </>
        }
      />
      <Card className="p-[18px]">
        <PasswordForm />
      </Card>
    </div>
  );
}
