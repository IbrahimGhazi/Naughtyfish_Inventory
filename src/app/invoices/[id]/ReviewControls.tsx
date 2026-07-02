"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { approveInvoice, attachDeliveryPhoto } from "../actions";

/** Office control: approve a delivery-entered draft after review. */
export function ApproveButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        data-testid="approve-invoice"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              setError(null);
              await approveInvoice(invoiceId);
              router.refresh();
            } catch (e) {
              setError((e as Error).message);
            }
          })
        }
        className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-on-accent disabled:opacity-50"
        style={{ background: "var(--pos)" }}
      >
        {isPending ? "Approving…" : "✓ Approve draft"}
      </button>
      {error && <span className="text-[11.5px] text-neg">{error}</span>}
    </div>
  );
}

/**
 * Delivered-package photo (roadmap M3.3). Shows the photo on the LATEST
 * delivery record, or a camera/file input to attach one. Client-side canvas
 * compression keeps the stored data URL small; never a submit gate.
 */
export function PhotoSection({
  invoiceId,
  photo,
  canUpload,
}: {
  invoiceId: string;
  /** Existing photo (data URL) on the latest delivery record, if any. */
  photo: string | null;
  canUpload: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await compress(file, 1280, 0.72);
      setPreview(dataUrl);
      startTransition(async () => {
        try {
          await attachDeliveryPhoto({ invoiceId, photoDataUrl: dataUrl });
          router.refresh();
        } catch (e) {
          setPreview(null);
          setError((e as Error).message);
        }
      });
    } catch {
      setError("Could not read that image — try another photo.");
    }
  }

  const shown = photo ?? preview;

  return (
    <Card className="p-[18px]">
      <div className="mb-2 flex items-baseline gap-1.5">
        <div className="font-serif text-[17px] font-semibold text-ink">Package photo</div>
        <span className="text-[12px] text-faint">· delivery confirmation, optional</span>
      </div>

      {shown ? (
        <a href={shown} target="_blank" rel="noreferrer" className="block max-w-[420px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shown}
            alt="Delivered package"
            className="w-full rounded-xl border border-hair object-cover"
            style={{ maxHeight: 320, opacity: isPending ? 0.6 : 1 }}
          />
          <span className="mt-1.5 block text-[11.5px] text-faint">
            {isPending ? "Uploading…" : "Attached to the latest delivery record. Tap to open."}
          </span>
        </a>
      ) : canUpload ? (
        <label
          className="flex max-w-[420px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors hover:bg-card2"
          style={{ borderColor: "var(--hair)" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span className="text-[13.5px] font-semibold text-text">
            {isPending ? "Uploading…" : "Take / choose a photo of the delivered package"}
          </span>
          <span className="text-[11.5px] text-faint">compressed automatically · JPG/PNG</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={isPending}
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
      ) : (
        <p className="text-[13px] text-faint">No photo attached.</p>
      )}

      {error && <p className="mt-2 text-[12.5px] text-neg">⚠ {error}</p>}
    </Card>
  );
}

/** Canvas-downscale to JPEG data URL (max side `maxPx`). */
async function compress(file: File, maxPx: number, quality: number): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
