"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      data-testid="do-print"
      onClick={() => window.print()}
      className="no-print inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold"
      style={{ background: "var(--ink)", color: "var(--card)" }}
    >
      Print / Save as PDF
    </button>
  );
}
