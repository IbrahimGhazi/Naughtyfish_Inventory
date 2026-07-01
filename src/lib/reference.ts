/** Format a reference number like SSI-000123 from a series config. */
export function formatReference(prefix: string, num: number, digitWidth: number): string {
  return `${prefix}${String(num).padStart(digitWidth, "0")}`;
}
