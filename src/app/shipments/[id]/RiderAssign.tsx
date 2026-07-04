"use client";

import { useState, useTransition } from "react";
import { assignShipmentRider } from "../rider-actions";

/** Office control to assign / clear the rider driving this shipment. */
export default function RiderAssign({
  shipmentId,
  riders,
  current,
}: {
  shipmentId: string;
  riders: { id: string; name: string }[];
  current: string | null;
}) {
  const [value, setValue] = useState(current ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const onChange = (v: string) => {
    setValue(v);
    setSaved(false);
    startTransition(async () => {
      try {
        await assignShipmentRider(shipmentId, v || null);
        setSaved(true);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not assign rider.");
        setValue(current ?? "");
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={pending}
        className="input"
        data-testid="rider-assign"
      >
        <option value="">Unassigned</option>
        {riders.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      {pending ? (
        <span className="text-xs text-faint">Saving…</span>
      ) : saved ? (
        <span className="text-xs text-pos">Saved</span>
      ) : null}
    </div>
  );
}
