/**
 * SeaStar Impex — annual sales report, FY 2025–26 (imported from the owner's
 * "SEASTAR IMPEX SALES REPORT 2025-2026.xlsx"). Static historical figures shown
 * on the dashboard; independent of the live ledger. Amounts in PKR.
 *
 * Reconciled: the monthly totals and the 456 invoice rows both sum to the same
 * grand total (153,358,464).
 */

export interface MonthlySales {
  month: string; // e.g. "Jul"
  year: number;
  amount: number;
}

export interface ClientSales {
  name: string;
  amount: number;
}

export const SALES_FY_LABEL = "FY 2025–26";

export const SALES_MONTHLY: MonthlySales[] = [
  { month: "Jul", year: 2025, amount: 13_908_789 },
  { month: "Aug", year: 2025, amount: 10_639_535 },
  { month: "Sep", year: 2025, amount: 16_857_072 },
  { month: "Oct", year: 2025, amount: 15_682_648 },
  { month: "Nov", year: 2025, amount: 15_309_074 },
  { month: "Dec", year: 2025, amount: 21_741_831 },
  { month: "Jan", year: 2026, amount: 12_326_992 },
  { month: "Feb", year: 2026, amount: 15_459_307 },
  { month: "Mar", year: 2026, amount: 12_162_002 },
  { month: "Apr", year: 2026, amount: 10_300_509 },
  { month: "May", year: 2026, amount: 8_970_705 },
  { month: "Jun", year: 2026, amount: 0 },
];

export const SALES_TOP_CLIENTS: ClientSales[] = [
  { name: "PC Lahore", amount: 45_040_585 },
  { name: "Marriott Islamabad", amount: 28_339_231 },
  { name: "PC Karachi", amount: 23_579_547 },
  { name: "PC Bhurban", amount: 18_405_009 },
  { name: "PC Rawalpindi", amount: 10_634_812 },
  { name: "Marriott Karachi", amount: 9_465_877 },
  { name: "Double Tree Hilton", amount: 6_561_700 },
  { name: "PC Malam Jabba", amount: 5_472_675 },
  { name: "Islamabad Club", amount: 2_073_839 },
  { name: "PC Muzaffarabad", amount: 2_013_989 },
  { name: "Dampukht Lahore", amount: 1_559_200 },
  { name: "Cecil Murree", amount: 212_000 },
];

export const SALES_GRAND_TOTAL = 153_358_464;
export const SALES_INVOICE_COUNT = 456;
