import { cookies } from "next/headers";
import { getOptionalContext } from "@/lib/session";
import { getAppConfig } from "@/lib/config";
import Sidebar from "./Sidebar";
import SidebarDrawer from "./SidebarDrawer";
import { MobileSidebarProvider } from "./MobileSidebarContext";
import Topbar from "./Topbar";
import Assistant from "./Assistant";
import OfflineSync from "./OfflineSync";
import { assistantConfigured } from "@/lib/assistant/llm";

/**
 * The app frame. Logged out (login page) renders children full-bleed. Logged in
 * renders the dark ink sidebar + a sticky topbar around the page content.
 *
 * Below `lg`, the sidebar becomes an off-canvas drawer (SidebarDrawer +
 * MobileSidebarProvider) toggled by a hamburger button in Topbar, instead of
 * the fixed 232px column — a permanent sidebar that wide would eat most of a
 * phone screen. `.page-container` supplies the responsive gutter every page
 * relies on (most pages carry NO padding of their own); it's reset to 0 for
 * print (see globals.css) so printed documents stay full-bleed.
 */
export default async function AppShell({ children }: { children: React.ReactNode }) {
  const [ctx, cfg] = await Promise.all([getOptionalContext(), getAppConfig()]);

  if (!ctx) {
    return <div className="min-h-full bg-paper">{children}</div>;
  }

  const isDark = (await cookies()).get("nf_theme")?.value === "dark";

  return (
    <MobileSidebarProvider>
      <div className="flex h-full overflow-hidden">
        <SidebarDrawer>
          <Sidebar
            entityName={ctx.entityName}
            userName={ctx.user.name}
            userRole={ctx.user.role}
          />
        </SidebarDrawer>
        <main className="min-w-0 flex-1 overflow-y-auto bg-paper2">
          <Topbar
            activeBook={ctx.entityName}
            canSwitch={
              cfg.features.secondBook &&
              (ctx.user.entityAccess === "both" || ctx.user.entityAccess === "nf")
            }
            isDark={isDark}
            appName={cfg.branding.appName}
          />
          <div className="page-container px-4 pb-10 pt-6 sm:px-6 sm:pt-7 lg:px-8">
            {children}
          </div>
        </main>
        {cfg.features.assistant && assistantConfigured() && <Assistant book={ctx.entityName} />}
        <OfflineSync />
      </div>
    </MobileSidebarProvider>
  );
}
