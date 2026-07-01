import { BackLink as SharedBackLink } from "@/components/ui";

/** Consistent "← Settings" back-link for every settings sub-page. */
export default function BackLink() {
  return <SharedBackLink href="/settings">← Settings</SharedBackLink>;
}
