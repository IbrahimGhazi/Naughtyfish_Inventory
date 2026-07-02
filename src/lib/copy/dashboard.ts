import type { CopyFragment } from "./types";

/**
 * Copy for the dashboard area. Each entry: a stable namespaced key, the English
 * default (source of truth), the editor group + a human label. Migration adds
 * entries here; render sites call t("<key>"). Keys MUST be globally unique.
 */
export const dashboardCopy: CopyFragment = [
  { key: "dashboard.recentInvoices", default: "Recent invoices", group: "Dashboard", label: "‘Recent invoices’ card title" },
  { key: "dashboard.onTheRoad", default: "On the road", group: "Dashboard", label: "‘On the road’ card title" },
];
