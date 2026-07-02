import type { CopyFragment } from "./types";

/**
 * Copy for the banks area. Each entry: a stable namespaced key, the English
 * default (source of truth), the editor group + a human label. Migration adds
 * entries here; render sites call t("<key>"). Keys MUST be globally unique.
 */
export const banksCopy: CopyFragment = [
  {
    key: "banks.eyebrow",
    default: "Money",
    group: "Bank accounts",
    label: "Page eyebrow",
  },
  {
    key: "banks.title",
    default: "Bank accounts",
    group: "Bank accounts",
    label: "Page title",
  },
  {
    key: "banks.totalEstBalance",
    default: "Total est. balance",
    group: "Bank accounts",
    label: "Header total balance label",
  },
  {
    key: "banks.bannerPrefix",
    default: "Estimated balances are a",
    group: "Bank accounts",
    label: "Info banner text before emphasized phrase",
  },
  {
    key: "banks.bannerManualPhrase",
    default: "manual number the owner updates",
    group: "Bank accounts",
    label: "Info banner emphasized phrase",
  },
  {
    key: "banks.bannerSuffix",
    default:
      "— never auto-decremented by payments or cheques. Click a balance to correct it.",
    group: "Bank accounts",
    label: "Info banner text after emphasized phrase",
    multiline: true,
  },
  {
    key: "banks.emptyState",
    default: "No bank accounts yet. Add one below.",
    group: "Bank accounts",
    label: "Empty-state message",
  },
  {
    key: "banks.addAccountHeading",
    default: "Add account",
    group: "Bank accounts",
    label: "Add-account card heading",
  },
  {
    key: "banks.editTooltip",
    default: "Click to correct",
    group: "Bank accounts",
    label: "Balance edit button tooltip",
  },
  {
    key: "banks.clickToCorrect",
    default: "click to correct",
    group: "Bank accounts",
    label: "Balance edit button hint",
  },
  {
    key: "banks.save",
    default: "Save",
    group: "Bank accounts",
    label: "Balance editor save button",
  },
  {
    key: "banks.cancel",
    default: "Cancel",
    group: "Bank accounts",
    label: "Balance editor cancel button",
  },
  {
    key: "banks.fieldBankName",
    default: "Bank name",
    group: "Bank accounts",
    label: "Add-form bank name field label",
  },
  {
    key: "banks.fieldAccountName",
    default: "Account name",
    group: "Bank accounts",
    label: "Add-form account name field label",
  },
  {
    key: "banks.fieldOpeningBalance",
    default: "Opening est. balance (PKR)",
    group: "Bank accounts",
    label: "Add-form opening balance field label",
  },
  {
    key: "banks.savingEllipsis",
    default: "Saving…",
    group: "Bank accounts",
    label: "Add-account button saving state",
  },
  {
    key: "banks.addAccountButton",
    default: "Add account",
    group: "Bank accounts",
    label: "Add-account submit button",
  },
];
