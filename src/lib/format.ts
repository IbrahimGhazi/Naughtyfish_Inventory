/** Display helpers. Money is PKR; weights in kg. */

export function pkr(n: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2,
  }).format(n);
}

export function kg(n: number): string {
  return `${new Intl.NumberFormat("en-PK", { maximumFractionDigits: 3 }).format(n)} kg`;
}

export function pct(n: number): string {
  return `${new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 }).format(n)}%`;
}

export function dateShort(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
}
