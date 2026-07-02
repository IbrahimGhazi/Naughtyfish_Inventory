/**
 * Editable-copy registry — aggregation + resolution. PURE (no prisma/react).
 *
 * Fragments are code-split per app area (one file each) so parallel edits never
 * collide on a single catalog file. Add strings to the relevant fragment; this
 * index merges them. See ./types for the entry shape.
 *
 * Authoring recipe:
 *   1. Add `{ key, default, group, label }` to src/lib/copy/<area>.ts.
 *   2. At the render site, replace the literal with t("<key>").
 *      - Server component:  const t = await getCopy();
 *      - Client component:  const t = useCopy();
 */

import type { CopyEntry, CopyMap, TFn } from "./types";
import { commonCopy } from "./common";
import { dashboardCopy } from "./dashboard";
import { invoicesCopy } from "./invoices";
import { partiesCopy } from "./parties";
import { inventoryCopy } from "./inventory";
import { shipmentsCopy } from "./shipments";
import { chequesCopy } from "./cheques";
import { banksCopy } from "./banks";
import { expensesCopy } from "./expenses";
import { reportsCopy } from "./reports";
import { settingsCopy } from "./settings";
import { processesCopy } from "./processes";
import { deliveryCopy } from "./delivery";
import { platformCopy } from "./platform";

export * from "./types";

/** Every registered string, in a stable order (grouped for the editor). */
export const COPY_CATALOG: readonly CopyEntry[] = [
  ...commonCopy,
  ...dashboardCopy,
  ...invoicesCopy,
  ...partiesCopy,
  ...inventoryCopy,
  ...shipmentsCopy,
  ...chequesCopy,
  ...banksCopy,
  ...expensesCopy,
  ...reportsCopy,
  ...settingsCopy,
  ...processesCopy,
  ...deliveryCopy,
  ...platformCopy,
];

/** key → English default. */
export const COPY_DEFAULTS: CopyMap = Object.fromEntries(
  COPY_CATALOG.map((e) => [e.key, e.default]),
);

/** All valid keys (used to reject stale/unknown overrides on read + save). */
export const COPY_KEY_SET: ReadonlySet<string> = new Set(Object.keys(COPY_DEFAULTS));

/** Per-override length cap (defense against oversized config rows). */
export const COPY_MAX_LEN = 600;

export interface CopyGroup {
  group: string;
  entries: CopyEntry[];
}

/** Catalog grouped by `group`, preserving first-seen order. For the editor. */
export const COPY_GROUPS: CopyGroup[] = (() => {
  const order: string[] = [];
  const byGroup = new Map<string, CopyEntry[]>();
  for (const e of COPY_CATALOG) {
    let list = byGroup.get(e.group);
    if (!list) {
      list = [];
      byGroup.set(e.group, list);
      order.push(e.group);
    }
    list.push(e);
  }
  return order.map((group) => ({ group, entries: byGroup.get(group)! }));
})();

/**
 * Overlay validated overrides on the defaults. Unknown keys, non-strings, and
 * empty values are ignored, so a stale override can never blank out a string.
 */
export function resolveCopy(overrides: CopyMap | undefined | null): CopyMap {
  const out: CopyMap = { ...COPY_DEFAULTS };
  if (overrides) {
    for (const [k, v] of Object.entries(overrides)) {
      if (COPY_KEY_SET.has(k) && typeof v === "string" && v.length > 0) out[k] = v;
    }
  }
  return out;
}

/**
 * Sanitize overrides for storage: keep only known keys whose value is a
 * non-empty, capped string that actually differs from the default (so the
 * stored row stays sparse — only real overrides persist).
 */
export function sanitizeCopyOverrides(o: unknown): CopyMap {
  const out: CopyMap = {};
  if (o && typeof o === "object") {
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (!COPY_KEY_SET.has(k) || typeof v !== "string") continue;
      const trimmed = v.trim();
      if (trimmed.length > 0 && trimmed.length <= COPY_MAX_LEN && trimmed !== COPY_DEFAULTS[k]) {
        out[k] = trimmed;
      }
    }
  }
  return out;
}

/** Build a translate function over a resolved map (falls back to key). */
export function makeT(map: CopyMap): TFn {
  return (key) => map[key] ?? COPY_DEFAULTS[key] ?? key;
}
