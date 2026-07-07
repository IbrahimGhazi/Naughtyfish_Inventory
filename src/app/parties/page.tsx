import { redirect } from "next/navigation";

/** Customers and suppliers are now separate sidebar tabs; send old links there. */
export default function PartiesPage() {
  redirect("/parties/customers");
}
