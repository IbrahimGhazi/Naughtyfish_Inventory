import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import SidebarNav, { type NavSection } from "./SidebarNav";
import { logout } from "./session-actions";

/** Icon paths (stroke, 24x24) keyed by nav item. */
const ICONS: Record<string, string> = {
  dashboard: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  invoices: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M15 13H9M15 17H9",
  parties: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75",
  shipments: "M1 4h14v12H1zM15 9h4l3 3v4h-7V9M5.5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4M17.5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
  inventory: "M21 16V8l-9-5-9 5v8l9 5 9-5zM3.3 7.3L12 12l8.7-4.7M12 22V12",
  cheques: "M3 6h18v13H3zM3 10h18M7 15h5",
  banks: "M3 10l9-6 9 6M4 10v8M8 10v8M12 10v8M16 10v8M20 10v8M2 21h20",
  expenses: "M3 7h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7V6a2 2 0 0 1 2-2h11v3M16.5 13.5h.01",
  reports: "M18 20V10M12 20V4M6 20v-6",
  settings: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4",
};

export default async function Sidebar({
  entityName,
  userName,
  userRole,
}: {
  entityName: string;
  userName: string;
  userRole: string;
}) {
  const ctx = await getActiveContext();
  const scope = entityScope(ctx);

  // Nav badges: unpaid invoices + cheques due soon.
  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const [invoiceCount, dueCheques] = await Promise.all([
    prisma.invoice.count({ where: scope }),
    prisma.cheque.count({
      where: {
        ...scope,
        status: { in: ["issued", "pending", "held"] },
        OR: [{ clearingDue: { lte: soon } }, { reminderDate: { lte: soon } }],
      },
    }),
  ]);

  const sections: NavSection[] = [
    {
      label: "Overview",
      items: [{ href: "/", key: "dashboard", label: "Dashboard", d: ICONS.dashboard }],
    },
    {
      label: "Sales",
      items: [
        { href: "/invoices", key: "invoices", label: "Invoices", d: ICONS.invoices, count: invoiceCount || undefined },
        { href: "/parties", key: "parties", label: "Parties", d: ICONS.parties },
      ],
    },
    {
      label: "Operations",
      items: [
        { href: "/shipments", key: "shipments", label: "Shipments", d: ICONS.shipments },
        { href: "/inventory", key: "inventory", label: "Inventory", d: ICONS.inventory },
      ],
    },
    {
      label: "Money",
      items: [
        { href: "/cheques", key: "cheques", label: "Cheques", d: ICONS.cheques, count: dueCheques || undefined },
        { href: "/banks", key: "banks", label: "Banks", d: ICONS.banks },
        { href: "/expenses", key: "expenses", label: "Expenses", d: ICONS.expenses },
      ],
    },
    {
      label: "Insight",
      items: [
        { href: "/reports", key: "reports", label: "Reports", d: ICONS.reports },
        { href: "/settings", key: "settings", label: "Settings", d: ICONS.settings },
      ],
    },
  ];

  const bookTag = entityName === "NF" ? "Black book · Karachi" : "White book · Karachi";
  const initials = userName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <aside
      className="flex w-[232px] flex-none flex-col overflow-y-auto"
      style={{ background: "var(--side-bg)", userSelect: "none" }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-[18px] pb-4 pt-5">
        <div
          className="flex h-[34px] w-[34px] items-center justify-center rounded-full"
          style={{ background: "rgba(242,235,217,.1)", animation: "swim 4s ease-in-out infinite" }}
        >
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
            <path
              d="M3.5 16c4.8-5.4 12-5.4 17.2-.8l5.1-3.5c.9-.6 2 .3 1.6 1.3L25.9 16l1.5 3c.4 1-.7 1.9-1.6 1.3l-5.1-3.5C15.5 21.4 8.3 21.4 3.5 16z"
              fill="var(--side-fg)"
            />
            <circle cx="8.4" cy="15.2" r="1.3" fill="var(--side-bg)" />
          </svg>
        </div>
        <div>
          <div
            className="font-serif text-[19px] font-semibold italic leading-none"
            style={{ color: "var(--side-fg)" }}
          >
            naughtyfish
          </div>
          <div
            className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--side-dim)" }}
          >
            {bookTag}
          </div>
        </div>
      </div>

      <SidebarNav sections={sections} />

      {/* User footer */}
      <div className="border-t p-3.5" style={{ borderColor: "var(--side-hair)" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-[#F6F2E6]"
            style={{ background: "var(--accent)" }}
          >
            {initials || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="truncate text-[12.5px] font-semibold"
              style={{ color: "var(--side-fg)" }}
            >
              {userName}
            </div>
            <div className="text-[10.5px] capitalize" style={{ color: "var(--side-dim)" }}>
              {userRole}
            </div>
          </div>
          <LockButton />
        </div>
      </div>
    </aside>
  );
}

function LockButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        title="Lock"
        data-testid="logout"
        className="flex h-7 w-7 items-center justify-center rounded-md"
        style={{ color: "var(--side-dim)" }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </button>
    </form>
  );
}
