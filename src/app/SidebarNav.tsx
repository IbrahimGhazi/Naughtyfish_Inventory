"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  key: string;
  label: string;
  d: string;
  count?: number;
}
export interface NavSection {
  label: string;
  items: NavItem[];
}

/** Is this nav item the active route? (invoices covers detail/new/edit, etc.) */
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function SidebarNav({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-[18px] px-3 pb-3 pt-1.5">
      {sections.map((sec) => (
        <div key={sec.label}>
          <div
            className="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{ color: "var(--side-dim)" }}
          >
            {sec.label}
          </div>
          <div className="flex flex-col gap-0.5">
            {sec.items.map((it) => {
              const active = isActive(pathname, it.href);
              return (
                <Link
                  key={it.key}
                  href={it.href}
                  data-testid={`nav-${it.key}`}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors"
                  style={{
                    fontWeight: active ? 600 : 500,
                    background: active ? "var(--side-active)" : "transparent",
                    color: active ? "var(--side-fg)" : "var(--side-dim)",
                  }}
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flex: "none", opacity: 0.85 }}
                  >
                    <path d={it.d} />
                  </svg>
                  <span className="flex-1">{it.label}</span>
                  {it.count ? (
                    <span
                      className="rounded-full px-[7px] py-px font-mono text-[10.5px]"
                      style={{ background: "rgba(242,235,217,.1)", color: "inherit" }}
                    >
                      {it.count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
