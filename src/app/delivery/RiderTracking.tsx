"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { claimShipment, releaseShipment } from "../shipments/rider-actions";

export interface RiderShipment {
  id: string;
  reference: string | null;
  originCity: string | null;
  destinationCity: string;
  destinationName: string | null;
  status: string;
}

const routeLabel = (s: RiderShipment) =>
  `${s.originCity ?? "Origin"} → ${s.destinationName || s.destinationCity}`;

/*
 * Rider location sharing. When the rider has an active assigned delivery, the
 * phone shares its GPS automatically (after the one-time permission prompt),
 * with a visible banner + Stop toggle. Foreground-only: the browser only sends
 * while this screen is open.
 */
export default function RiderTracking({
  assigned,
  claimable,
}: {
  assigned: RiderShipment[];
  claimable: RiderShipment[];
}) {
  const active = assigned[0] ?? null;
  const [paused, setPaused] = useState(false);
  const [geoStatus, setGeoStatus] = useState<null | "sharing" | "denied" | "error">(null);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [pending, startTransition] = useTransition();

  const sharing = !!active && !paused;
  const lastPost = useRef(0);

  useEffect(() => {
    if (!sharing) return;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      queueMicrotask(() => setGeoStatus("error"));
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoStatus("sharing");
        const now = Date.now();
        if (now - lastPost.current < 15000) return; // throttle network to ~15s
        lastPost.current = now;
        const { latitude, longitude, accuracy } = pos.coords;
        void fetch("/api/rider/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: latitude, lng: longitude, accuracy }),
          keepalive: true,
        })
          .then(() => setLastSent(new Date()))
          .catch(() => {});
      },
      (err) => setGeoStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error"),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [sharing]);

  const claim = (shipmentId: string) =>
    startTransition(async () => {
      try {
        await claimShipment(shipmentId);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not start that delivery.");
      }
    });
  const release = (shipmentId: string) =>
    startTransition(async () => {
      try {
        await releaseShipment(shipmentId);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not stop that delivery.");
      }
    });

  return (
    <div className="space-y-3">
      {active ? (
        <div className="overflow-hidden rounded-2xl border border-hair bg-card">
          <div className="border-b border-hair2 bg-card2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint2">
            Your delivery
          </div>
          <div className="p-4">
            <div className="text-[15px] font-semibold text-ink">{routeLabel(active)}</div>
            {active.reference && (
              <div className="mt-0.5 font-mono text-[12px] text-gold">{active.reference}</div>
            )}

            {/* Sharing status */}
            <div className="mt-3 flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={sharingBoxStyle(sharing, geoStatus)}>
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: sharing && geoStatus === "sharing" ? "var(--pos)" : sharing ? "var(--warn)" : "var(--faint)" }}
              />
              <div className="min-w-0 flex-1 text-[12.5px]">
                {!sharing ? (
                  <span className="font-semibold text-muted">Location sharing paused</span>
                ) : geoStatus === "denied" ? (
                  <span className="font-semibold text-neg">
                    Location is off — enable location for this site in your browser settings.
                  </span>
                ) : geoStatus === "error" ? (
                  <span className="font-semibold text-neg">Couldn&apos;t read your location.</span>
                ) : geoStatus === "sharing" ? (
                  <span className="font-semibold text-ink">
                    Sharing your live location
                    {lastSent ? ` · sent ${lastSent.toLocaleTimeString()}` : ""}
                  </span>
                ) : (
                  <span className="font-semibold text-muted">Starting GPS…</span>
                )}
              </div>
              <button
                onClick={() => setPaused((p) => !p)}
                className="shrink-0 rounded-lg border border-hair bg-card px-2.5 py-1 text-[12px] font-semibold text-text transition-colors hover:bg-card2"
              >
                {paused ? "Resume" : "Stop"}
              </button>
            </div>

            <p className="mt-2 text-[11px] text-faint">
              Your location updates the office truck tracker while this screen is open.
            </p>

            <button
              onClick={() => release(active.id)}
              disabled={pending}
              className="mt-2 text-[12px] font-semibold text-muted underline underline-offset-2 hover:text-accent-deep disabled:opacity-50"
            >
              Not on this delivery anymore
            </button>
          </div>
        </div>
      ) : claimable.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-hair bg-card">
          <div className="border-b border-hair2 bg-card2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint2">
            Start a delivery
          </div>
          <ul className="divide-y divide-row">
            {claimable.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold text-ink">{routeLabel(s)}</div>
                  {s.reference && <div className="font-mono text-[11.5px] text-gold">{s.reference}</div>}
                </div>
                <button
                  onClick={() => claim(s.id)}
                  disabled={pending}
                  className="shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-on-accent disabled:opacity-50"
                  style={{ background: "var(--accent)" }}
                >
                  I&apos;m on this
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-2xl border border-hair bg-card px-4 py-4 text-[13px] text-faint">
          No active truck deliveries to share your location for right now.
        </div>
      )}
    </div>
  );
}

function sharingBoxStyle(sharing: boolean, status: string | null): React.CSSProperties {
  if (sharing && status === "sharing") return { background: "var(--card2)" };
  if (sharing && (status === "denied" || status === "error")) return { background: "var(--warn-bg)" };
  return { background: "var(--card2)" };
}
