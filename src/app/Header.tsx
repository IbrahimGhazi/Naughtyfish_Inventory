import Link from "next/link";
import { cookies } from "next/headers";
import { getOptionalContext, allowedBookNames } from "@/lib/session";
import HeaderControls from "./HeaderControls";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/invoices/new", label: "New Invoice" },
  { href: "/invoices", label: "Invoices" },
  { href: "/parties", label: "Parties & Ledgers" },
  { href: "/inventory", label: "Inventory" },
  { href: "/shipments", label: "Shipments" },
  { href: "/expenses", label: "Expenses" },
  { href: "/cheques", label: "Cheques" },
  { href: "/banks", label: "Banks" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

/**
 * Server-rendered header. Uses getOptionalContext() (NOT the redirecting one) —
 * /login shares this layout, so the header must render when logged out too.
 */
export default async function Header() {
  const ctx = await getOptionalContext();
  const isDark = (await cookies()).get("nf_theme")?.value === "dark";

  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight text-cyan-700 dark:text-cyan-400">
          🐟 NaughtyFish
        </Link>

        {ctx && (
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-slate-600 hover:text-cyan-700 dark:text-slate-300 dark:hover:text-cyan-400"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle initialDark={isDark} />
          {ctx && (
            <HeaderControls
              userName={ctx.user.name}
              activeBook={ctx.entityName}
              books={allowedBookNames(ctx.user.entityAccess)}
            />
          )}
        </div>
      </div>
    </header>
  );
}
