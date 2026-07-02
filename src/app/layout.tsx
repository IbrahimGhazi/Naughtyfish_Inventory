import type { Metadata } from "next";
import {
  Newsreader, IBM_Plex_Sans, IBM_Plex_Mono,
  Playfair_Display, Inter, JetBrains_Mono,
  Fraunces, Source_Sans_3, Source_Code_Pro,
  Lora, Karla, Space_Mono,
} from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import AppShell from "./AppShell";
import { getAppConfig, themeCss, unitsScript, resolveCopy } from "@/lib/config";
import { CopyProvider } from "@/lib/copy/CopyProvider";

/*
 * White-label font trios. next/font requires MODULE-SCOPE declarations, so all
 * four trios are declared here and the platform config picks one at render
 * time. Every serif shares the variable name --font-newsreader (etc.) so
 * globals.css needs no changes — only the chosen trio's classes are applied to
 * <html>.
 *
 * PRELOAD: next/font emits <link rel="preload" as="font"> for every declared
 * font regardless of which classes render (~600 KB across 19 woff2 files if
 * all twelve preload). So only the default "Ledger classic" trio keeps
 * preload: true; the other nine set preload: false and load on demand via
 * their @font-face rules when a deployment picks that preset (brief swap-in
 * on first paint — acceptable).
 * Keys must stay in sync with FONT_PRESETS in src/lib/config-shared.ts.
 */
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
  preload: true, // default trio — the only one preloaded
});
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  preload: true, // default trio — the only one preloaded
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  preload: true, // default trio — the only one preloaded
});

const playfair = Playfair_Display({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});
const inter = Inter({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});
const jetbrains = JetBrains_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  preload: false,
});

const fraunces = Fraunces({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});
const sourceSans = Source_Sans_3({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});
const sourceCode = Source_Code_Pro({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  preload: false,
});

const lora = Lora({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});
const karla = Karla({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});
const spaceMono = Space_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "700"], // Space Mono ships only 400/700
  preload: false,
});

const FONT_TRIOS: Record<string, string> = {
  "newsreader-plex": `${newsreader.variable} ${plexSans.variable} ${plexMono.variable}`,
  "playfair-inter": `${playfair.variable} ${inter.variable} ${jetbrains.variable}`,
  "fraunces-source": `${fraunces.variable} ${sourceSans.variable} ${sourceCode.variable}`,
  "lora-karla": `${lora.variable} ${karla.variable} ${spaceMono.variable}`,
};

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getAppConfig();
  return {
    title: cfg.branding.appName,
    description: `${cfg.branding.businessType} — ${cfg.branding.tagline}`,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [isDarkCookie, cfg] = await Promise.all([
    cookies().then((c) => c.get("nf_theme")?.value === "dark"),
    getAppConfig(),
  ]);

  const fontClasses = FONT_TRIOS[cfg.theme.fontPreset] ?? FONT_TRIOS["newsreader-plex"];

  return (
    <html
      lang="en"
      className={`${fontClasses} h-full${isDarkCookie ? " dark" : ""}`}
    >
      <body className="h-full">
        {/* White-label theme: per-deployment token overrides (platform panel).
            A body-level <style> is valid HTML and avoids fighting the Metadata
            API for <head> ownership (Next docs: don't hand-write <head>). */}
        <style id="brand-theme" dangerouslySetInnerHTML={{ __html: themeCss(cfg.theme) }} />
        {/* Mirror currency/weight units to the browser BEFORE hydration so
            client components (forms, live totals) format like the server. */}
        <script dangerouslySetInnerHTML={{ __html: unitsScript(cfg) }} />
        <CopyProvider map={resolveCopy(cfg.copy)}>
          <AppShell>{children}</AppShell>
        </CopyProvider>
      </body>
    </html>
  );
}
