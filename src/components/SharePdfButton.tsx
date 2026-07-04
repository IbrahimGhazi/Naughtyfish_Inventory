"use client";

import { useState } from "react";
import type { PdfKind, PdfPayload } from "@/lib/pdf/types";

/*
 * Generates a PDF on the device and opens the native share sheet (WhatsApp,
 * etc.); falls back to downloading the file. jsPDF is code-split — it only
 * loads when the button is tapped, so it never weighs down the main bundle.
 */
export default function SharePdfButton({
  kind,
  payload,
  filename,
  shareText,
  label = "Share on WhatsApp",
  className,
  testid,
}: {
  kind: PdfKind;
  payload: PdfPayload;
  filename: string;
  shareText: string;
  label?: string;
  className?: string;
  testid?: string;
}) {
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    try {
      const [{ buildPdf }, { sharePdf }] = await Promise.all([
        import("@/lib/pdf/builders"),
        import("@/lib/pdf/share"),
      ]);
      const blob = buildPdf(kind, payload);
      await sharePdf(blob, filename, shareText);
    } catch (err) {
      console.error("PDF share failed", err);
      if (typeof window !== "undefined") window.alert("Couldn't create the PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      data-testid={testid}
      className={
        className ??
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-on-accent disabled:opacity-60"
      }
      style={className ? undefined : { background: "var(--accent)" }}
    >
      <WhatsAppGlyph />
      {busy ? "Preparing…" : label}
    </button>
  );
}

function WhatsAppGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.15h-.01c-1.52 0-3.01-.41-4.3-1.18l-.31-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.35c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.42-.14-.01-.31-.01-.48-.01-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.57.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z" />
    </svg>
  );
}
