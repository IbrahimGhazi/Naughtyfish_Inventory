"use client";

/**
 * Mobile sidebar (drawer) open/closed state, shared between the hamburger
 * toggle in Topbar and the drawer wrapper around Sidebar — they're siblings
 * under AppShell, so plain prop-drilling won't reach across, hence a small
 * context instead of lifting state into a much bigger shared client component.
 */

import { createContext, useContext, useState, type ReactNode } from "react";

interface MobileSidebarState {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const MobileSidebarContext = createContext<MobileSidebarState | null>(null);

export function MobileSidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <MobileSidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </MobileSidebarContext.Provider>
  );
}

/** Throws outside the provider — every consumer lives inside AppShell's tree. */
export function useMobileSidebar(): MobileSidebarState {
  const ctx = useContext(MobileSidebarContext);
  if (!ctx) throw new Error("useMobileSidebar must be used within MobileSidebarProvider");
  return ctx;
}
