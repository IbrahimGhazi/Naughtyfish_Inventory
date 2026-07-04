import type { MetadataRoute } from "next";
import { getAppConfig } from "@/lib/config";

// Served at /manifest.webmanifest. Built from the white-label config so the
// installed-app name + brand colour follow each deployment automatically.
export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const cfg = await getAppConfig();
  const name = cfg.branding.appName;
  const shortName = name.length > 12 ? name.split(/\s+/)[0].slice(0, 12) : name;

  return {
    name,
    short_name: shortName,
    description: `${cfg.branding.businessType} — ${cfg.branding.tagline}`,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Light paper as the splash background; dark brand for the status-bar tint.
    background_color: "#f1ebdd",
    theme_color: cfg.theme.sideBg,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
