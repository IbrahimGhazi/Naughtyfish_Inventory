/*
 * Share a generated PDF via the native share sheet (which includes WhatsApp on
 * phones). Falls back to a plain download when file-sharing isn't supported
 * (e.g. most desktop browsers). Returns what actually happened.
 */
export async function sharePdf(
  blob: Blob,
  filename: string,
  text: string,
): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "application/pdf" });
  const nav = navigator as Navigator & {
    canShare?: (data?: { files?: File[] }) => boolean;
  };

  if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: filename, text });
      return "shared";
    } catch (err) {
      // User dismissed the sheet — respect that, don't force a download.
      if (err instanceof DOMException && err.name === "AbortError") return "shared";
      // Any other failure → fall through to download.
    }
  }

  download(blob, filename);
  return "downloaded";
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
