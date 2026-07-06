"use client";

import { useState } from "react";
import type { ReactNode } from "react";

/**
 * Client-side tab switcher for the customers / suppliers split. Takes the two
 * already-rendered sections as props and shows only the active one, defaulting
 * to Customers. Used by both the main parties page and the settings parties
 * page so the switch behaves identically in either place.
 */
export function PartyTabs({
  customersLabel,
  suppliersLabel,
  customers,
  suppliers,
}: {
  customersLabel: string;
  suppliersLabel: string;
  customers: ReactNode;
  suppliers: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<"customers" | "suppliers">("customers");

  const tab = (key: "customers" | "suppliers", label: string) => {
    const active = activeTab === key;
    return (
      <button
        type="button"
        role="tab"
        data-testid={`party-tab-${key}`}
        aria-selected={active}
        onClick={() => setActiveTab(key)}
        className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
          active ? "text-on-accent" : "text-muted hover:bg-card2"
        }`}
        style={active ? { background: "var(--accent)" } : undefined}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="space-y-3.5">
      <div role="tablist" className="flex items-center gap-1.5">
        {tab("customers", customersLabel)}
        {tab("suppliers", suppliersLabel)}
      </div>
      <div>{activeTab === "customers" ? customers : suppliers}</div>
    </div>
  );
}
