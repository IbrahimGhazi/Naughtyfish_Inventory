"use client";

import { useParams } from "next/navigation";
import PartyDetail from "../PartyDetail";

// Deep-link entry for a single customer (e.g. a bookmarked URL). The in-app
// Field flow renders PartyDetail inline instead of navigating here, so this is
// mainly for direct links; "back" returns to the Field hub.
export default function FieldPartyPage() {
  const { partyId } = useParams<{ partyId: string }>();
  return (
    <div className="mx-auto max-w-[760px]">
      <PartyDetail
        partyId={partyId}
        onBack={() => {
          window.location.href = "/field";
        }}
      />
    </div>
  );
}
