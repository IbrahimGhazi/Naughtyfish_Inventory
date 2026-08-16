import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import "./globals.css";
import AppShell from "./AppShell";
import PwaManager from "./PwaManager";
import { getAppConfig, themeCss, unitsScript, resolveCopy } from "@/lib/config";
import { CopyProvider } from "@/lib/copy/CopyProvider";

/*
 * White-label font trios. next/font requires MODULE-SCOPE declarations, so all
 * four trios are declared here and the platform config picks one at render
 * time. Every serif shares the variable name --font-newsreader (etc.) so
 * globals.css needs no changes — only the chosen trio's classes are applied to
 * <html>.
 *
 * SELF-HOSTED: these were `next/font/google`, which downloads font binaries
 * from fonts.gstatic.com during `next build`. Google rotates those file URLs,
 * and a stale entry in Next's font cache took production builds down with
 * "404 ... fonts.gstatic.com/s/playfairdisplay/..." followed by 16 x
 * "Can't resolve '@vercel/turbopack-next/internal/font/google/font'".
 * The builds that passed were the ones that restored a warm font cache and
 * skipped the fetch — which is why it looked intermittent. The .woff2 files
 * now live in ./fonts and the build makes no network request at all.
 * Regenerate them with `npm run fonts` after changing this list.
 *
 * `src` arrays are written out longhand because Next requires font-loader
 * arguments to be literals — a helper that builds them fails the build.
 *
 * PRELOAD: next/font emits <link rel="preload" as="font"> for every declared
 * font regardless of which classes render (~600 KB across 19 woff2 files if
 * all twelve preload). So only the default "Ledger classic" trio keeps
 * preload: true; the other nine set preload: false and load on demand via
 * their @font-face rules when a deployment picks that preset (brief swap-in
 * on first paint — acceptable).
 * Keys must stay in sync with FONT_PRESETS in src/lib/config-shared.ts.
 */
const newsreader = localFont({
  variable: "--font-newsreader",
  display: "swap",
  preload: true, // default trio — the only one preloaded
  src: [
    { path: "./fonts/newsreader-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/newsreader-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/newsreader-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/newsreader-500-italic.woff2", weight: "500", style: "italic" },
    { path: "./fonts/newsreader-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/newsreader-600-italic.woff2", weight: "600", style: "italic" },
    { path: "./fonts/newsreader-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/newsreader-700-italic.woff2", weight: "700", style: "italic" },
  ],
});
const plexSans = localFont({
  variable: "--font-plex-sans",
  display: "swap",
  preload: true, // default trio — the only one preloaded
  src: [
    { path: "./fonts/ibm-plex-sans-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-sans-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-sans-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/ibm-plex-sans-700-normal.woff2", weight: "700", style: "normal" },
  ],
});
const plexMono = localFont({
  variable: "--font-plex-mono",
  display: "swap",
  preload: true, // default trio — the only one preloaded
  src: [
    { path: "./fonts/ibm-plex-mono-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-mono-600-normal.woff2", weight: "600", style: "normal" },
  ],
});

const playfair = localFont({
  variable: "--font-newsreader",
  display: "swap",
  preload: false,
  src: [
    { path: "./fonts/playfair-display-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/playfair-display-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/playfair-display-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/playfair-display-500-italic.woff2", weight: "500", style: "italic" },
    { path: "./fonts/playfair-display-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/playfair-display-600-italic.woff2", weight: "600", style: "italic" },
    { path: "./fonts/playfair-display-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/playfair-display-700-italic.woff2", weight: "700", style: "italic" },
  ],
});
const inter = localFont({
  variable: "--font-plex-sans",
  display: "swap",
  preload: false,
  src: [
    { path: "./fonts/inter-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/inter-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/inter-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/inter-700-normal.woff2", weight: "700", style: "normal" },
  ],
});
const jetbrains = localFont({
  variable: "--font-plex-mono",
  display: "swap",
  preload: false,
  src: [
    { path: "./fonts/jetbrains-mono-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/jetbrains-mono-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/jetbrains-mono-600-normal.woff2", weight: "600", style: "normal" },
  ],
});

const fraunces = localFont({
  variable: "--font-newsreader",
  display: "swap",
  preload: false,
  src: [
    { path: "./fonts/fraunces-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/fraunces-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/fraunces-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/fraunces-500-italic.woff2", weight: "500", style: "italic" },
    { path: "./fonts/fraunces-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/fraunces-600-italic.woff2", weight: "600", style: "italic" },
    { path: "./fonts/fraunces-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/fraunces-700-italic.woff2", weight: "700", style: "italic" },
  ],
});
const sourceSans = localFont({
  variable: "--font-plex-sans",
  display: "swap",
  preload: false,
  src: [
    { path: "./fonts/source-sans-3-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/source-sans-3-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/source-sans-3-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/source-sans-3-700-normal.woff2", weight: "700", style: "normal" },
  ],
});
const sourceCode = localFont({
  variable: "--font-plex-mono",
  display: "swap",
  preload: false,
  src: [
    { path: "./fonts/source-code-pro-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/source-code-pro-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/source-code-pro-600-normal.woff2", weight: "600", style: "normal" },
  ],
});

const lora = localFont({
  variable: "--font-newsreader",
  display: "swap",
  preload: false,
  src: [
    { path: "./fonts/lora-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/lora-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/lora-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/lora-500-italic.woff2", weight: "500", style: "italic" },
    { path: "./fonts/lora-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/lora-600-italic.woff2", weight: "600", style: "italic" },
    { path: "./fonts/lora-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/lora-700-italic.woff2", weight: "700", style: "italic" },
  ],
});
const karla = localFont({
  variable: "--font-plex-sans",
  display: "swap",
  preload: false,
  src: [
    { path: "./fonts/karla-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/karla-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/karla-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/karla-700-normal.woff2", weight: "700", style: "normal" },
  ],
});
const spaceMono = localFont({
  variable: "--font-plex-mono",
  display: "swap",
  preload: false, // Space Mono ships only 400/700
  src: [
    { path: "./fonts/space-mono-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/space-mono-700-normal.woff2", weight: "700", style: "normal" },
  ],
});

const FONT_TRIOS: Record<string, string> = {
  "newsreader-plex": `${newsreader.variable} ${plexSans.variable} ${plexMono.variable}`,
  "playfair-inter": `${playfair.variable} ${inter.variable} ${jetbrains.variable}`,
  "fraunces-source": `${fraunces.variable} ${sourceSans.variable} ${sourceCode.variable}`,
  "lora-karla": `${lora.variable} ${karla.variable} ${spaceMono.variable}`,
};

export const viewport: Viewport = {
  themeColor: "#0d1f26",
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getAppConfig();
  return {
    title: cfg.branding.appName,
    description: `${cfg.branding.businessType} — ${cfg.branding.tagline}`,
    manifest: "/manifest.webmanifest",
    icons: { apple: "/icons/apple-touch-icon.png" },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: cfg.branding.appName,
    },
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
        <PwaManager />
      </body>
    </html>
  );
}
