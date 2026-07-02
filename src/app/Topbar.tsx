"use client";

import { useTransition } from "react";
import { usePathname } from "next/navigation";
import { switchBook } from "./session-actions";
import ThemeToggle from "./ThemeToggle";
import { useCopy } from "@/lib/copy/CopyProvider";
import type { TFn } from "@/lib/copy";

/** pathname prefix → [eyebrow copy key, title copy key]. Longest match wins. */
const TITLES: [string, string, string][] = [
  ["/invoices/new", "shell.topbar.eyebrow.sales", "shell.topbar.title.newInvoice"],
  ["/invoices/", "shell.topbar.eyebrow.sales", "shell.topbar.title.invoiceDetail"],
  ["/invoices", "shell.topbar.eyebrow.sales", "shell.topbar.title.invoices"],
  ["/parties/", "shell.topbar.eyebrow.sales", "shell.topbar.title.partyLedger"],
  ["/parties", "shell.topbar.eyebrow.sales", "shell.topbar.title.parties"],
  ["/shipments", "shell.topbar.eyebrow.operations", "shell.topbar.title.shipments"],
  ["/inventory", "shell.topbar.eyebrow.operations", "shell.topbar.title.inventory"],
  ["/processes", "shell.topbar.eyebrow.operations", "shell.topbar.title.processes"],
  ["/cheques", "shell.topbar.eyebrow.money", "shell.topbar.title.cheques"],
  ["/banks", "shell.topbar.eyebrow.money", "shell.topbar.title.banks"],
  ["/expenses", "shell.topbar.eyebrow.money", "shell.topbar.title.expenses"],
  ["/reports/bad-debts", "shell.topbar.eyebrow.insight", "shell.topbar.title.badDebts"],
  ["/reports/weekly", "shell.topbar.eyebrow.insight", "shell.topbar.title.weeklyStatement"],
  ["/reports", "shell.topbar.eyebrow.insight", "shell.topbar.title.reports"],
  ["/settings/password", "shell.topbar.eyebrow.admin", "shell.topbar.title.password"],
  ["/settings", "shell.topbar.eyebrow.admin", "shell.topbar.title.settings"],
  ["/platform", "shell.topbar.eyebrow.productOwner", "shell.topbar.title.platform"],
  ["/delivery/new", "shell.topbar.eyebrow.delivery", "shell.topbar.title.deliveryNewInvoice"],
  ["/delivery/invoices", "shell.topbar.eyebrow.delivery", "shell.topbar.title.deliveryMyInvoices"],
  ["/delivery", "shell.topbar.eyebrow.delivery", "shell.topbar.title.deliveryHome"],
  ["/", "shell.topbar.eyebrow.overview", "shell.topbar.title.dashboard"],
];

function titleFor(pathname: string, appName: string, t: TFn): { eyebrow: string; title: string } {
  for (const [prefix, eyebrowKey, titleKey] of TITLES) {
    if (prefix === "/" ? pathname === "/" : pathname.startsWith(prefix)) {
      return { eyebrow: t(eyebrowKey), title: t(titleKey) };
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
  const t = useCopy();
  const { eyebrow, title } = titleFor(pathname, appName, t);

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
