import type { CopyFragment } from "./types";

/**
 * Copy for the cheques area. Each entry: a stable namespaced key, the English
 * default (source of truth), the editor group + a human label. Migration adds
 * entries here; render sites call t("<key>"). Keys MUST be globally unique.
 */
export const chequesCopy: CopyFragment = [
];
