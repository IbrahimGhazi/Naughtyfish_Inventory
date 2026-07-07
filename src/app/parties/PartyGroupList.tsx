import Link from "next/link";
import { Card } from "@/components/ui";

export type PartyRow = {
  id: string;
  name: string;
  subType: string | null;
  channel: string | null;
};

/** Two-letter initials from a party name. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Shared card list for a single party group (customers OR suppliers). */
export function PartyGroupList({
  tone,
  parties,
  emptyLabel,
}: {
  tone: "accent" | "gold";
  parties: PartyRow[];
  emptyLabel: string;
}) {
  const avatar =
    tone === "accent"
      ? { background: "var(--accent-tint)", color: "var(--accent-deep)" }
      : { background: "var(--warn-bg)", color: "var(--gold)" };

  return (
    <Card className="overflow-hidden">
      {parties.length === 0 ? (
        <p className="px-4 py-6 text-sm text-faint">{emptyLabel}</p>
      ) : (
        <ul>
          {parties.map((p) => (
            <li key={p.id} className="border-b border-row last:border-b-0">
              <Link
                href={`/parties/${p.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-card2"
              >
                <div
                  className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] text-[12px] font-bold"
                  style={avatar}
                >
                  {initials(p.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-text">{p.name}</div>
                  <div className="text-[11.5px] text-muted">
                    {[p.subType, p.channel].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
