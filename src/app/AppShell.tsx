import { cookies } from "next/headers";
import { getOptionalContext } from "@/lib/session";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

/**
 * The app frame. Logged out (login page) renders children full-bleed. Logged in
 * renders the dark ink sidebar + a sticky topbar around the page content.
 */
export default async function AppShell({ children }: { children: React.ReactNode }) {
  const ctx = await getOptionalContext();

  if (!ctx) {
    return <div className="min-h-full bg-paper">{children}</div>;
  }

  const isDark = (await cookies()).get("nf_theme")?.value === "dark";

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar
        entityName={ctx.entityName}
        userName={ctx.user.name}
        userRole={ctx.user.role}
      />
      <main className="flex-1 overflow-y-auto bg-paper2">
        <Topbar
          activeBook={ctx.entityName}
          canSwitch={ctx.user.entityAccess === "both" || ctx.user.entityAccess === "nf"}
          isDark={isDark}
        />
        {children}
      </main>
    </div>
  );
}
