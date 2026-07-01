"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      data-testid="wk-do-print"
      onClick={() => window.print()}
      className="no-print rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800"
    >
      Print / Save as PDF
    </button>
  );
}
