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
import { getAppConfig, themeCss, unitsScript } from "@/lib/config";

/*
 * White-label font trios. next/font requires MODULE-SCOPE declarations, so all
 * four trios are declared here and the platform config picks one at render
 * time. Every serif shares the variable name --font-newsreader (etc.) so
 * globals.css needs no changes — only the chosen trio's classes are applied to
 * <html>, and browsers only download fonts that rendered CSS actually uses.
 * Keys must stay in sync with FONT_PRESETS in src/lib/config-shared.ts.
 */
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const playfair = Playfair_Display({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});
const inter = Inter({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const jetbrains = JetBrains_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const fraunces = Fraunces({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});
const sourceSans = Source_Sans_3({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const sourceCode = Source_Code_Pro({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const lora = Lora({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});
const karla = Karla({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const spaceMono = Space_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "700"], // Space Mono ships only 400/700
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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
