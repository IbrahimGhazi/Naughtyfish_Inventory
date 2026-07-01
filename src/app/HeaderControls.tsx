"use client";

import { useTransition } from "react";
import { switchBook, logout } from "./session-actions";

/**
 * Right-side header controls: user name, active-book badge, the two-button
 * C-Star/NF switch (only when both books are allowed), and Logout.
 */
export default function HeaderControls({
  userName,
  activeBook,
  books,
}: {
  userName: string;
  activeBook: string;
  books: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const canSwitch = books.length > 1;

  return (
    <div className="flex items-center gap-3 text-sm">
      {canSwitch ? (
        <div className="flex overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
          {books.map((b) => (
            <button
              key={b}
              type="button"
              data-testid={`switch-book-${b}`}
              disabled={isPending || b === activeBook}
              onClick={() => startTransition(() => switchBook(b))}
              className={`px-2.5 py-1 text-xs font-medium ${
                b === activeBook
                  ? "bg-cyan-700 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      ) : (
        <span
          className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          data-testid="active-book-badge"
        >
          {activeBook}
        </span>
      )}

      <span className="text-slate-500 dark:text-slate-400" data-testid="user-name">
        {userName}
      </span>

      <form action={logout}>
        <button
          type="submit"
          data-testid="logout"
          className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Logout
        </button>
      </form>
    </div>
  );
}
