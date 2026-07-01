import Link from "next/link";

/** Consistent "← Settings" back-link for every settings sub-page. */
export default function BackLink() {
  return (
    <Link
      href="/settings"
      className="text-sm text-slate-500 hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-400"
    >
      ← Settings
    </Link>
  );
}
