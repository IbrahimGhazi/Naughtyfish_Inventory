#!/usr/bin/env node
/*
 * Download the self-hosted font files used by src/app/layout.tsx.
 *
 * Why this exists: `next/font/google` fetches font binaries from
 * fonts.gstatic.com during `next build`. Google rotates those file URLs, and a
 * stale entry in Next's font cache means the build dies with
 *
 *   Received response with status 404 ... fonts.gstatic.com/s/playfairdisplay/...
 *   Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
 *
 * which is exactly what took production builds down. Self-hosting via
 * `next/font/local` removes the build-time network dependency entirely.
 *
 * Run this only when the font list in src/app/layout.tsx changes:
 *
 *   node scripts/fetch-fonts.mjs
 *
 * The downloaded .woff2 files are committed — that is the point.
 */

import { mkdir, writeFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "app", "fonts");

// Only the `latin` subset is fetched, matching `subsets: ["latin"]` in layout.tsx.
const SUBSET = "latin";

// Mirrors the declarations in src/app/layout.tsx. Keep the two in sync.
const FONTS = [
  // Serifs — the trios' display faces, all with italics.
  { slug: "newsreader", family: "Newsreader", weights: [400, 500, 600, 700], italic: true },
  { slug: "playfair-display", family: "Playfair Display", weights: [400, 500, 600, 700], italic: true },
  { slug: "fraunces", family: "Fraunces", weights: [400, 500, 600, 700], italic: true },
  { slug: "lora", family: "Lora", weights: [400, 500, 600, 700], italic: true },

  // Sans faces.
  { slug: "ibm-plex-sans", family: "IBM Plex Sans", weights: [400, 500, 600, 700], italic: false },
  { slug: "inter", family: "Inter", weights: [400, 500, 600, 700], italic: false },
  { slug: "source-sans-3", family: "Source Sans 3", weights: [400, 500, 600, 700], italic: false },
  { slug: "karla", family: "Karla", weights: [400, 500, 600, 700], italic: false },

  // Monospace faces.
  { slug: "ibm-plex-mono", family: "IBM Plex Mono", weights: [400, 500, 600], italic: false },
  { slug: "jetbrains-mono", family: "JetBrains Mono", weights: [400, 500, 600], italic: false },
  { slug: "source-code-pro", family: "Source Code Pro", weights: [400, 500, 600], italic: false },
  { slug: "space-mono", family: "Space Mono", weights: [400, 700], italic: false }, // ships only 400/700
];

// Without a browser UA, Google serves TTF instead of the much smaller WOFF2.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function cssUrl({ family, weights, italic }) {
  const name = family.replace(/ /g, "+");
  const axis = italic
    ? `ital,wght@${weights.map((w) => `0,${w}`).join(";")};${weights.map((w) => `1,${w}`).join(";")}`
    : `wght@${weights.join(";")}`;
  return `https://fonts.googleapis.com/css2?family=${name}:${axis}&display=swap`;
}

async function fetchRetry(url, opts = {}, attempts = 4) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, opts);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      lastError = e;
      // Exponential backoff — this is the network flakiness we're escaping.
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 2 ** i * 1000));
    }
  }
  throw new Error(`${url}: ${lastError.message}`);
}

/**
 * Split the stylesheet into @font-face blocks, each tagged with the subset
 * named by the `/* latin *​/` comment that precedes it.
 */
function parseFaces(css) {
  const faces = [];
  const re = /\/\*\s*([a-z0-9-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/gi;
  let m;
  while ((m = re.exec(css)) !== null) {
    const [, subset, body] = m;
    const style = (body.match(/font-style:\s*([a-z]+)/i) || [])[1] || "normal";
    const weight = (body.match(/font-weight:\s*(\d+)/i) || [])[1];
    const url = (body.match(/url\((https:\/\/[^)]+\.woff2)\)/i) || [])[1];
    if (weight && url) faces.push({ subset, style, weight, url });
  }
  return faces;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  let downloaded = 0;
  const missing = [];

  for (const font of FONTS) {
    const css = await (await fetchRetry(cssUrl(font), { headers: { "User-Agent": UA } })).text();
    const faces = parseFaces(css).filter((f) => f.subset === SUBSET);

    const styles = font.italic ? ["normal", "italic"] : ["normal"];
    for (const weight of font.weights) {
      for (const style of styles) {
        const face = faces.find((f) => f.weight === String(weight) && f.style === style);
        if (!face) {
          missing.push(`${font.family} ${weight} ${style}`);
          continue;
        }
        const buf = Buffer.from(await (await fetchRetry(face.url)).arrayBuffer());
        await writeFile(join(OUT_DIR, `${font.slug}-${weight}-${style}.woff2`), buf);
        downloaded++;
      }
    }
    process.stdout.write(`${font.family}: ${font.weights.length * styles.length} faces\n`);
  }

  if (missing.length) {
    console.error(`\nMISSING ${missing.length} face(s):\n  ${missing.join("\n  ")}`);
    process.exit(1);
  }

  const onDisk = (await readdir(OUT_DIR)).filter((f) => f.endsWith(".woff2"));
  console.log(`\nDownloaded ${downloaded} faces; ${onDisk.length} .woff2 in src/app/fonts/`);
}

await main();
