"use client";

/**
 * Client-side access to editable copy. The root layout resolves the copy map on
 * the server (defaults + this deployment's overrides) and passes it here; client
 * components read strings via useCopy(). Because it's seeded from server-rendered
 * config and re-provided on every render, there's no hydration mismatch and no
 * globalThis side-channel.
 */

import { createContext, useContext, useMemo } from "react";
import { makeT, type CopyMap, type TFn } from "./index";

const CopyContext = createContext<CopyMap | null>(null);

export function CopyProvider({ map, children }: { map: CopyMap; children: React.ReactNode }) {
  return <CopyContext.Provider value={map}>{children}</CopyContext.Provider>;
}

/** Returns t(key) for client components. Falls back to defaults/key if unmounted. */
export function useCopy(): TFn {
  const map = useContext(CopyContext);
  return useMemo(() => makeT(map ?? {}), [map]);
}
