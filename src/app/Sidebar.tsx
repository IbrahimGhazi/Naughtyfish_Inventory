import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { getAppConfig, getCopy } from "@/lib/config";
import { hasView, type PageKey } from "@/lib/roles";
import SidebarNav, { type NavItem, type NavSection } from "./SidebarNav";
import { logout } from "./session-actions";

/** Icon paths (stroke, 24x24) keyed by nav item. */
const ICONS: Record<string, string> = {
  dashboard: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  invoices: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M15 13H9M15 17H9",
  parties: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75",
  shipments: "M1 4h14v12H1zM15 9h4l3 3v4h-7V9M5.5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4M17.5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
  inventory: "M21 16V8l-9-5-9 5v8l9 5 9-5zM3.3 7.3L12 12l8.7-4.7M12 22V12",
  processes: "M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.2 2.2M16.2 16.2l2.2 2.2M5.6 18.4l2.2-2.2M16.2 7.8l2.2-2.2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
  cheques: "M3 6h18v13H3zM3 10h18M7 15h5",
  banks: "M3 10l9-6 9 6M4 10v8M8 10v8M12 10v8M16 10v8M20 10v8M2 21h20",
  expenses: "M3 7h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7V6a2 2 0 0 1 2-2h11v3M16.5 13.5h.01",
  reports: "M18 20V10M12 20V4M6 20v-6",
  settings: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4",
  purchases: "M6 6h15l-1.5 9h-12L6 6zM6 6L5 3H2M9.5 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M17.5 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3",
  stores: "M3 9l1.6-5h14.8L21 9M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M3 9h18M9 20v-6h6v6",
  platform: "M12 2l9 5v10l-9 5-9-5V7l9-5zM12 22V12M3 7l9 5 9-5",
  delivery: "M3 7h11v10H3zM14 10h4l3 3v4h-7v-7M6.5 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M17.5 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3",
  camera: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  field: "M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01",
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
  const cfg = await getAppConfig();
  const t = await getCopy();
  const f = cfg.features;

  const can = (page: PageKey) => hasView(ctx.user.perms, page);

  let sections: NavSection[];

  if (userRole === "delivery") {
    // Restricted delivery portal: invoice entry + own invoices only.
    sections = [
      {
        label: t("shell.nav.section.delivery"),
        items: [
          { href: "/delivery", key: "delivery", label: t("shell.nav.deliveryHome"), d: ICONS.dashboard },
          { href: "/delivery/new", key: "delivery-new", label: t("shell.nav.deliveryNew"), d: ICONS.invoices },
          { href: "/delivery/invoices", key: "delivery-invoices", label: t("shell.nav.deliveryInvoices"), d: ICONS.delivery },
        ],
      },
    ];
  } else {
    // Nav badges: invoice count, drafts awaiting review + cheques due soon.
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const [invoiceCount, dueCheques] = await Promise.all([
      prisma.invoice.count({ where: scope }),
      f.cheques
        ? prisma.cheque.count({
            where: {
              ...scope,
              status: { in: ["issued", "pending", "held"] },
              OR: [{ clearingDue: { lte: soon } }, { reminderDate: { lte: soon } }],
            },
          })
        : Promise.resolve(0),
    ]);

    const sales: NavItem[] = [];
    if (can("invoices"))
      sales.push({ href: "/invoices", key: "invoices", label: t("shell.nav.invoices"), d: ICONS.invoices, count: invoiceCount || undefined });
    if (can("parties")) {
      sales.push({ href: "/parties/customers", key: "parties-customers", label: t("shell.nav.customers"), d: ICONS.parties });
      sales.push({ href: "/parties/suppliers", key: "parties-suppliers", label: t("shell.nav.suppliers"), d: ICONS.parties });
    }

    const buying: NavItem[] = [];
    if (f.purchases && can("purchases"))
      buying.push({ href: "/purchases", key: "purchases", label: t("purchases.nav.item"), d: ICONS.purchases });

    const ops: NavItem[] = [];
    if (f.shipments && can("shipments"))
      ops.push({ href: "/shipments", key: "shipments", label: t("shell.nav.shipments"), d: ICONS.shipments });
    if (can("inventory"))
      ops.push({ href: "/inventory", key: "inventory", label: t("shell.nav.inventory"), d: ICONS.inventory });
    if (f.processes && can("processes"))
      ops.push({ href: "/processes", key: "processes", label: t("shell.nav.processes"), d: ICONS.processes });

    const money: NavItem[] = [];
    if (f.cheques && can("cheques"))
      money.push({ href: "/cheques", key: "cheques", label: t("shell.nav.cheques"), d: ICONS.cheques, count: dueCheques || undefined });
    if (f.banks && can("banks"))
      money.push({ href: "/banks", key: "banks", label: t("shell.nav.banks"), d: ICONS.banks });
    if (f.expenses && can("expenses")) {
      money.push({ href: "/expenses", key: "expenses", label: t("shell.nav.expenses"), d: ICONS.expenses });
      money.push({ href: "/stores", key: "stores", label: t("shell.nav.storeCosts"), d: ICONS.stores });
    }

    const insight: NavItem[] = [];
    if (f.reports && can("reports"))
      insight.push({ href: "/reports", key: "reports", label: t("shell.nav.reports"), d: ICONS.reports });
    if (can("settings"))
      insight.push({ href: "/settings", key: "settings", label: t("shell.nav.settings"), d: ICONS.settings });

    sections = [
      {
        label: t("shell.nav.section.overview"),
        items: [
          { href: "/", key: "dashboard", label: t("shell.nav.dashboard"), d: ICONS.dashboard },
          ...(can("parties")
            ? [{ href: "/field", key: "field", label: "Field", d: ICONS.field }]
            : []),
        ],
      },
      ...(sales.length ? [{ label: t("shell.nav.section.sales"), items: sales }] : []),
      ...(buying.length ? [{ label: t("purchases.nav.section"), items: buying }] : []),
      ...(ops.length ? [{ label: t("shell.nav.section.operations"), items: ops }] : []),
      ...(money.length ? [{ label: t("shell.nav.section.money"), items: money }] : []),
      ...(insight.length ? [{ label: t("shell.nav.section.insight"), items: insight }] : []),
      // Product-owner panel — platform_admin only, invisible to client roles.
      ...(can("platform")
        ? [{ label: t("shell.nav.section.productOwner"), items: [{ href: "/platform", key: "platform", label: t("shell.nav.platform"), d: ICONS.platform }] }]
        : []),
    ];
  }

  const bookTag =
    entityName === "NF" ? t("shell.sidebar.blackBookPrefix") + cfg.branding.tagline : cfg.branding.tagline;
  const initials = userName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <aside
      className="flex h-full w-[232px] flex-none flex-col overflow-y-auto"
      style={{ background: "var(--side-bg)", userSelect: "none" }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-[18px] pb-4 pt-5">
        <div
          className="flex h-[34px] w-[34px] items-center justify-center overflow-hidden rounded-full"
          style={{ background: "rgba(242,235,217,.1)", animation: "swim 4s ease-in-out infinite" }}
        >
          {cfg.branding.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cfg.branding.logoDataUrl}
              alt={cfg.branding.appName}
              className="h-full w-full object-cover"
            />
          ) : (
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <path
                d="M3.5 16c4.8-5.4 12-5.4 17.2-.8l5.1-3.5c.9-.6 2 .3 1.6 1.3L25.9 16l1.5 3c.4 1-.7 1.9-1.6 1.3l-5.1-3.5C15.5 21.4 8.3 21.4 3.5 16z"
                fill="var(--side-fg)"
              />
              <circle cx="8.4" cy="15.2" r="1.3" fill="var(--side-bg)" />
            </svg>
          )}
        </div>
        <div>
          <div
            className="font-serif text-[19px] font-semibold italic leading-none"
            style={{ color: "var(--side-fg)" }}
          >
            {cfg.branding.appName}
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
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-on-accent"
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
              {userRole.replace(/_/g, " ")}
            </div>
          </div>
          <LockButton title={t("shell.sidebar.lock")} />
        </div>
      </div>
    </aside>
  );
}

function LockButton({ title }: { title: string }) {
  return (
    <form action={logout}>
      <button
        type="submit"
        title={title}
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
