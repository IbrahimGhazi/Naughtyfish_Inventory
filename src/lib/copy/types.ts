/**
 * Editable-copy registry — PURE types (no prisma, no react). Safe to import
 * from client components, server code, and unit tests.
 *
 * Every user-facing string in the app is registered here as a CopyEntry with a
 * stable key + English default. Render sites read it via t("<key>") (server:
 * `const t = await getCopy()`; client: `const t = useCopy()`). The platform
 * panel lists every entry (grouped, searchable) so a white-label operator can
 * override any wording per deployment; overrides live in AppConfig.copy.
 */

export interface CopyEntry {
  /** Stable, globally-unique, namespaced key, e.g. "dashboard.newInvoice". */
  key: string;
  /** English default — the source of truth shown when there's no override. */
  default: string;
  /** Editor section this appears under, e.g. "Dashboard". */
  group: string;
  /** Human label in the editor, e.g. "‘New invoice’ button". */
  label: string;
  /** Render a textarea (for long/multi-sentence copy) instead of an input. */
  multiline?: boolean;
}

export type CopyFragment = readonly CopyEntry[];

/** A resolved lookup: defaults overlaid with (validated) overrides. */
export type CopyMap = Record<string, string>;

/** The translate function returned by getCopy()/useCopy(). */
export type TFn = (key: string) => string;
