"use client";

/**
 * Wraps the (server-rendered) Sidebar so it behaves as an off-canvas drawer
 * below the `lg` breakpoint — hidden by default, slides in over a backdrop
 * when the hamburger (Topbar) toggles it open — and as the normal static
 * column at `lg` and above. Auto-closes on route change so a nav tap doesn't
 * leave the drawer hanging open over the new page.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useMobileSidebar } from "./MobileSidebarContext";

export default function SidebarDrawer({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = useMobileSidebar();
  const pathname = usePathname();

  // Close on navigation — a link tap should always dismiss the drawer.
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <>
      {/* Backdrop — mobile only, only when open. */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-40 h-full transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {children}
      </div>
    </>
  );
}
