"use client";

import { useTransition } from "react";
import { usePathname } from "next/navigation";
import { switchBook } from "./session-actions";
import ThemeToggle from "./ThemeToggle";

/** pathname prefix → [eyebrow, title]. Longest match wins. */
const TITLES: [string, string, string][] = [
  ["/invoices/new", "Sales", "New invoice"],
  ["/invoices/", "Sales", "Invoice detail"],
  ["/invoices", "Sales", "Invoices"],
  ["/parties/", "Sales", "Party ledger"],
  ["/parties", "Sales", "Parties"],
  ["/shipments", "Operations", "Shipments"],
  ["/inventory", "Operations", "Inventory"],
  ["/processes", "Operations", "Processes"],
  ["/cheques", "Money", "Cheques"],
  ["/banks", "Money", "Banks"],
  ["/expenses", "Money", "Expenses"],
  ["/reports/bad-debts", "Insight", "Bad debts & disputes"],
  ["/reports/weekly", "Insight", "Weekly statement"],
  ["/reports", "Insight", "Reports"],
  ["/settings/password", "Admin", "Password"],
  ["/settings", "Admin", "Settings"],
  ["/platform", "Product owner", "Platform"],
  ["/delivery/new", "Delivery", "New invoice"],
  ["/delivery/invoices", "Delivery", "My invoices"],
  ["/delivery", "Delivery", "Home"],
  ["/", "Overview", "Dashboard"],
];

function titleFor(pathname: string, appName: string): { eyebrow: string; title: string } {
  for (const [prefix, eyebrow, title] of TITLES) {
    if (prefix === "/" ? pathname === "/" : pathname.startsWith(prefix)) {
      return { eyebrow, title };
    }
  }
  return { eyebrow: "", title: appName };
}

export default function Topbar({
  activeBook,
  canSwitch,
  isDark,
  appName = "NaughtyFish",
}: {
  activeBook: string;
  canSwitch: boolean;
  isDark: boolean;
  appName?: string;
}) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { eyebrow, title } = titleFor(pathname, appName);

  const seg = (book: string) => {
    const on = book === activeBook;
    return (
      <button
        key={book}
        type="button"
        data-testid={`switch-book-${book}`}
        disabled={isPending || on}
        onClick={() => startTransition(() => switchBook(book))}
        className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
        style={
          on
            ? { background: "var(--ink)", color: "var(--card)" }
            : { background: "transparent", color: "var(--muted)" }
        }
      >
        {book}
      </button>
    );
  };

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className="sticky top-0 z-20 flex items-center gap-3.5 border-b border-hair2 px-8 py-3.5"
      style={{ background: "color-mix(in srgb, var(--paper-2) 92%, transparent)", backdropFilter: "blur(8px)" }}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
          {eyebrow}
        </div>
        <div className="font-serif text-[19px] font-semibold leading-tight text-ink">{title}</div>
      </div>
      <div className="hidden font-mono text-xs text-muted sm:block">{today}</div>
      {canSwitch && (
        <div
          className="flex gap-0.5 rounded-lg border border-hair p-[3px]"
          style={{ background: "var(--card-2)" }}
        >
          {seg("C-Star")}
          {seg("NF")}
        </div>
      )}
      <ThemeToggle initialDark={isDark} />
    </div>
  );
}
