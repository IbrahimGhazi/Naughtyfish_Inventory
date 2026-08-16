// ============================================================================
// Masjid Prayer Times — iOS home screen widget for Scriptable
//
// Shows the next prayer with a live countdown, all five daily prayer times,
// the Hijri date and the masjid name. Runs in the free Scriptable app, so it
// needs no Mac, no Xcode and no Apple Developer account.
//
//   Install:  see ios-widget/README.md
//   Data:     auto-discovered from the site (see EXTRACTION STRATEGIES below)
//   Debug:    run the script inside Scriptable (not as a widget) to get a
//             diagnostic report copied to your clipboard.
//
// Target: https://masajid.masjidinformationsystem.com
// ============================================================================

// ----------------------------------------------------------------------------
// CONFIG — everything you might want to change lives here.
// ----------------------------------------------------------------------------
const CONFIG = {
  // Base site. No trailing slash.
  siteUrl: "https://masajid.masjidinformationsystem.com",

  // Which masjid to show. Accepts the username, the English name, or the
  // masjid's page URL — https://…/masjid/mudassirmasjid all work the same.
  // Matching ignores case, punctuation and doubled letters, so "mudasir"
  // finds "Masjid-e-Mudassir" too. Leave empty to use the first masjid the
  // site lists. Override per-widget with the widget parameter
  // (long-press widget -> Edit Widget -> Parameter).
  masjid: "mudassirmasjid",

  // Page to read times from, relative to siteUrl. Only used by the HTML
  // strategies; leave empty for this site, which is a client-rendered app.
  pagePath: "",

  // If you know the JSON endpoint, set it and discovery is skipped entirely.
  // Example: "https://masajid.masjidinformationsystem.com/api/prayer-times"
  apiUrl: "",

  // Count down to the jamaat/iqamah time when the site provides one,
  // otherwise the start (adhan) time. Set to "start" to always use adhan.
  countdownTo: "jamaat", // "jamaat" | "start"

  use24Hour: false,

  // How often iOS is asked to refresh. iOS treats this as a hint, not a promise.
  refreshMinutes: 15,

  // Network timeout per request, seconds.
  timeout: 12,

  // Tap target when the widget is tapped.
  tapUrl: "", // defaults to siteUrl + pagePath
};

// ----------------------------------------------------------------------------
// CONSTANTS
// ----------------------------------------------------------------------------

// Every spelling of each prayer we are willing to recognise, lowercased.
// Order matters: the list index defines the order prayers are displayed.
const PRAYERS = [
  { key: "fajr", label: "Fajr", aliases: ["fajr", "fajar", "fajir", "fjr", "subh", "sobh", "subuh", "dawn"] },
  { key: "dhuhr", label: "Dhuhr", aliases: ["dhuhr", "duhr", "zuhr", "zohr", "dhuhur", "zuhur", "luhr", "dhur", "noon"] },
  { key: "asr", label: "Asr", aliases: ["asr", "assr", "asar"] },
  { key: "maghrib", label: "Maghrib", aliases: ["maghrib", "magrib", "maghreb", "magreb", "sunset"] },
  { key: "isha", label: "Isha", aliases: ["isha", "ishaa", "esha", "eshaa", "isya", "ishā", "nightprayer"] },
];

// Keys that, inside a per-prayer object, hold the adhan/start time.
const START_KEYS = ["start", "begin", "begins", "beginning", "adhan", "athan", "azan", "azaan", "time", "starttime", "adhaan"];
// Keys that hold the congregation time.
const JAMAAT_KEYS = ["jamaat", "jamaah", "jamat", "jammat", "iqamah", "iqama", "iqamat", "congregation", "jamaattime", "iqamahtime"];

// Keys that plausibly hold the masjid's name.
const NAME_KEYS = ["masjid", "masjidname", "mosque", "mosquename", "name", "title", "masjidtitle"];

// Candidate JSON endpoints tried during discovery, in order.
const API_CANDIDATES = [
  "/api/prayer-times", "/api/prayertimes", "/api/timings", "/api/times",
  "/api/salah", "/api/salaah", "/api/prayers", "/api/masjid",
  "/api/today", "/api/schedule", "/prayer-times.json", "/timings.json",
];

const THEME = {
  bgTop: Color.dynamic(new Color("#f7faf8"), new Color("#0d1f18")),
  bgBottom: Color.dynamic(new Color("#e8f1ec"), new Color("#06120d")),
  text: Color.dynamic(new Color("#12241c"), new Color("#eaf3ee")),
  dim: Color.dynamic(new Color("#5d7268"), new Color("#8aa79a")),
  accent: Color.dynamic(new Color("#0f7a52"), new Color("#3fd39a")),
  gold: Color.dynamic(new Color("#a67c12"), new Color("#e8c25f")),
  rule: Color.dynamic(new Color("#00000012"), new Color("#ffffff14")),
};

const CACHE_FILE = "masjid-widget-cache.json";

// ============================================================================
// TIME HELPERS
// ============================================================================

/**
 * Parse a time-ish value into minutes since local midnight.
 * Handles "5:12", "05:12", "5:12 AM", "17:12", "5.12pm" and ISO timestamps.
 * Returns null when the value is not a time.
 */
function parseTimeToMinutes(value) {
  if (value == null) return null;

  if (typeof value === "number") {
    // Epoch seconds/millis are the only numbers we trust as times.
    if (value > 1e11) return dateToMinutes(new Date(value));
    if (value > 1e9) return dateToMinutes(new Date(value * 1000));
    return null;
  }

  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;

  // ISO datetime, e.g. 2026-08-15T17:12:00Z
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(raw)) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return dateToMinutes(d);
  }

  const m = raw.match(/^(\d{1,2})\s*[:.hH]\s*(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/i);
  if (!m) return null;

  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  if (isNaN(hour) || isNaN(minute) || minute > 59 || hour > 23) return null;

  const meridiem = (m[3] || "").toLowerCase().replace(/\./g, "");
  if (meridiem.startsWith("p") && hour < 12) hour += 12;
  if (meridiem.startsWith("a") && hour === 12) hour = 0;

  return hour * 60 + minute;
}

function dateToMinutes(d) {
  return d.getHours() * 60 + d.getMinutes();
}

/** Render minutes-since-midnight for display, honouring CONFIG.use24Hour. */
function formatTime(minutes) {
  if (minutes == null) return "—";
  let hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  const mm = String(minute).padStart(2, "0");

  if (CONFIG.use24Hour) return `${String(hour).padStart(2, "0")}:${mm}`;

  const suffix = hour >= 12 ? "PM" : "AM";
  let h12 = hour % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${mm} ${suffix}`;
}

/** "1h 23m" / "23m" / "now". */
function formatCountdown(totalMinutes) {
  if (totalMinutes <= 0) return "now";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Hijri date computed on-device — no network needed. */
function hijriDate(date) {
  for (const locale of ["en-u-ca-islamic-umalqura", "en-u-ca-islamic", "en-TN-u-ca-islamic"]) {
    try {
      const s = new Intl.DateTimeFormat(locale, {
        day: "numeric", month: "long", year: "numeric",
      }).format(date);
      if (s && !/NaN/.test(s)) return s.replace(/\s*AH\s*$/, " AH");
    } catch (e) { /* locale unsupported, try next */ }
  }
  return null;
}

// ============================================================================
// EXTRACTION STRATEGIES
//
// We do not know this site's shape, so rather than hard-coding one parser we
// try several, cheapest-and-most-reliable first, and stop at the first that
// yields a usable schedule:
//
//   1. explicit CONFIG.apiUrl            (you told us where the data is)
//   2. __NEXT_DATA__ blob in the HTML    (Next.js pages/app router SSR payload)
//   3. RSC flight payload self.__next_f  (Next.js app router streaming)
//   4. any inline JSON containing "fajr" (generic embedded state)
//   5. label/time regex over the HTML    (last resort, brittle)
//   6. probing common /api/* endpoints   (client-rendered SPA)
// ============================================================================

/** Walk any JSON value, calling visit(node, keyPath) on every object. */
function walkObjects(root, visit, maxNodes = 60000) {
  const stack = [[root, ""]];
  let seen = 0;
  while (stack.length && seen < maxNodes) {
    const [node, path] = stack.pop();
    seen++;
    if (node === null || typeof node !== "object") continue;
    if (!Array.isArray(node)) visit(node, path);
    const entries = Array.isArray(node)
      ? node.map((v, i) => [String(i), v])
      : Object.entries(node);
    for (const [k, v] of entries) {
      if (v !== null && typeof v === "object") stack.push([v, path ? `${path}.${k}` : k]);
    }
  }
}

const normKey = (k) => String(k).toLowerCase().replace(/[^a-z]/g, "");

/** Which prayer, if any, does this object key name? */
function prayerForKey(key) {
  const n = normKey(key);
  if (!n) return null;
  for (const p of PRAYERS) {
    if (p.aliases.includes(n)) return p;
  }
  // Tolerate suffixed keys like "fajrJamaat" / "asr_time".
  for (const p of PRAYERS) {
    for (const alias of p.aliases) {
      if (n.startsWith(alias) && n.length - alias.length <= 12) return p;
    }
  }
  return null;
}

/** Pull {start, jamaat} out of whatever a prayer key points at. */
function readPrayerValue(key, value) {
  const out = { start: null, jamaat: null };
  const n = normKey(key);

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) {
      const nk = normKey(k);
      const t = parseTimeToMinutes(v);
      if (t == null) continue;
      if (JAMAAT_KEYS.includes(nk) && out.jamaat == null) out.jamaat = t;
      else if (START_KEYS.includes(nk) && out.start == null) out.start = t;
    }
    // Object with a single unlabelled time value.
    if (out.start == null && out.jamaat == null) {
      for (const v of Object.values(value)) {
        const t = parseTimeToMinutes(v);
        if (t != null) { out.start = t; break; }
      }
    }
    return out;
  }

  const t = parseTimeToMinutes(value);
  if (t == null) return out;

  // A flat key that names the congregation directly, e.g. "fajrJamaat".
  const isJamaatKey = JAMAAT_KEYS.some((j) => n.includes(j));
  if (isJamaatKey) out.jamaat = t;
  else out.start = t;
  return out;
}

/**
 * Find the best prayer-times object anywhere inside a parsed JSON value.
 * "Best" = most distinct prayers resolved. Returns null below 3 prayers,
 * which keeps us from locking onto an unrelated object that happens to
 * contain the word "asr".
 */
function scheduleFromJson(root) {
  let best = null;

  walkObjects(root, (obj, path) => {
    const found = {};
    for (const [k, v] of Object.entries(obj)) {
      const prayer = prayerForKey(k);
      if (!prayer) continue;
      const parsed = readPrayerValue(k, v);
      if (parsed.start == null && parsed.jamaat == null) continue;

      const existing = found[prayer.key] || { start: null, jamaat: null };
      found[prayer.key] = {
        start: existing.start != null ? existing.start : parsed.start,
        jamaat: existing.jamaat != null ? existing.jamaat : parsed.jamaat,
      };
    }

    const count = Object.keys(found).length;
    if (count < 3) return;
    if (!best || count > best.count) {
      best = { count, found, path, container: obj };
    }
  });

  if (!best) return null;
  return {
    prayers: PRAYERS.map((p) => ({
      key: p.key,
      label: p.label,
      start: best.found[p.key] ? best.found[p.key].start : null,
      jamaat: best.found[p.key] ? best.found[p.key].jamaat : null,
    })),
    masjid: masjidNameFrom(root, best.container),
    detail: `json@${best.path || "root"} (${best.count}/5)`,
  };
}

/** Best-effort masjid name: prefer the object holding the times, else the root. */
function masjidNameFrom(root, container) {
  const pick = (obj) => {
    if (!obj || typeof obj !== "object") return null;
    for (const wanted of NAME_KEYS) {
      for (const [k, v] of Object.entries(obj)) {
        if (normKey(k) !== wanted) continue;
        if (typeof v === "string" && v.trim() && v.length < 80) return v.trim();
        if (v && typeof v === "object" && typeof v.name === "string") return v.name.trim();
      }
    }
    return null;
  };

  const direct = pick(container);
  if (direct) return direct;

  let found = null;
  walkObjects(root, (obj) => {
    if (found) return;
    const n = pick(obj);
    if (n) found = n;
  }, 4000);
  return found;
}

/**
 * Scan raw text for JSON objects that mention a prayer name, and parse them.
 * Used for RSC flight payloads and loose inline state where we cannot rely on
 * a single well-known <script> tag.
 */
function scheduleFromLooseJson(text) {
  const needles = ["fajr", "Fajr", "FAJR", "maghrib", "Maghrib"];
  const tried = new Set();

  for (const needle of needles) {
    let from = 0;
    let hits = 0;
    while (hits < 12) {
      const idx = text.indexOf(needle, from);
      if (idx === -1) break;
      from = idx + needle.length;
      hits++;

      // Walk backwards over candidate opening braces and take the first that
      // parses into a balanced object containing a usable schedule.
      let brace = idx;
      for (let attempt = 0; attempt < 25; attempt++) {
        brace = text.lastIndexOf("{", brace - 1);
        if (brace === -1) break;
        if (tried.has(brace)) continue;
        tried.add(brace);

        const slice = balancedSlice(text, brace);
        if (!slice) continue;
        try {
          const parsed = JSON.parse(slice);
          const schedule = scheduleFromJson(parsed);
          if (!schedule) continue;
          // We lock onto the innermost object holding the times, which often
          // excludes the masjid's name — it usually sits on a parent. Widen a
          // few levels to look for it, but keep the times we already trust.
          if (!schedule.masjid) schedule.masjid = findNameInOuterScopes(text, brace);
          return schedule;
        } catch (e) { /* not valid JSON from here, keep widening */ }
      }
    }
  }
  return null;
}

/**
 * Walk outwards from an inner object's opening brace looking for an enclosing
 * object that names the masjid. Returns null if none of them do.
 */
function findNameInOuterScopes(text, innerBrace, maxLevels = 10) {
  let brace = innerBrace;
  for (let level = 0; level < maxLevels; level++) {
    brace = text.lastIndexOf("{", brace - 1);
    if (brace === -1) return null;
    const slice = balancedSlice(text, brace);
    if (!slice) continue;
    try {
      const name = masjidNameFrom(JSON.parse(slice), null);
      if (name) return name;
    } catch (e) { /* keep widening */ }
  }
  return null;
}

/** Return the balanced {...} starting at `start`, or null. String-aware. */
function balancedSlice(text, start, limit = 400000) {
  if (text[start] !== "{") return null;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length && i - start < limit; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** Next.js __NEXT_DATA__ script tag. */
function scheduleFromNextData(html) {
  const m = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return null;
  try {
    const schedule = scheduleFromJson(JSON.parse(m[1]));
    if (schedule) schedule.detail = `__NEXT_DATA__ ${schedule.detail}`;
    return schedule;
  } catch (e) {
    return null;
  }
}

/** Next.js app-router streaming payload: self.__next_f.push([1,"...json..."]). */
function scheduleFromFlight(html) {
  const chunks = [];
  const re = /self\.__next_f\.push\(\s*\[\s*\d+\s*,\s*("(?:[^"\\]|\\.)*")\s*\]\s*\)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    try { chunks.push(JSON.parse(m[1])); } catch (e) { /* skip bad chunk */ }
  }
  if (!chunks.length) return null;

  const schedule = scheduleFromLooseJson(chunks.join(""));
  if (schedule) schedule.detail = `__next_f ${schedule.detail}`;
  return schedule;
}

/** Any other inline JSON (Nuxt, Redux preloaded state, JSON-LD, ...). */
function scheduleFromInlineJson(html) {
  const schedule = scheduleFromLooseJson(html);
  if (schedule) schedule.detail = `inline ${schedule.detail}`;
  return schedule;
}

/** Last resort: read "Fajr .... 5:12 am" straight out of the rendered text. */
function scheduleFromHtmlText(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ");

  const found = {};
  for (const p of PRAYERS) {
    const alt = p.aliases.filter((a) => a.length > 2).join("|");
    // Prayer name, then up to two times: start, then optionally jamaat.
    const re = new RegExp(
      `\\b(?:${alt})\\b[^0-9]{0,40}(\\d{1,2}[:.]\\d{2}\\s*(?:am|pm)?)` +
      `(?:[^0-9]{0,25}(\\d{1,2}[:.]\\d{2}\\s*(?:am|pm)?))?`,
      "i"
    );
    const m = text.match(re);
    if (!m) continue;
    const start = parseTimeToMinutes(m[1]);
    const second = m[2] ? parseTimeToMinutes(m[2]) : null;
    if (start == null) continue;
    found[p.key] = { start, jamaat: second };
  }

  if (Object.keys(found).length < 3) return null;

  return {
    prayers: PRAYERS.map((p) => ({
      key: p.key,
      label: p.label,
      start: found[p.key] ? found[p.key].start : null,
      jamaat: found[p.key] ? found[p.key].jamaat : null,
    })),
    masjid: masjidNameFromHtml(html),
    detail: `html-text (${Object.keys(found).length}/5)`,
  };
}

function masjidNameFromHtml(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const t = h1[1].replace(/<[^>]+>/g, "").trim();
    if (t && t.length < 80) return t;
  }
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title) {
    const t = title[1].replace(/<[^>]+>/g, "").trim();
    if (t && t.length < 80) return t.split(/\s*[|\-–]\s*/)[0].trim();
  }
  return null;
}

// ============================================================================
// BUNDLE DISCOVERY
//
// For a client-rendered SPA the HTML is an empty shell, so there is nothing to
// parse and guessing endpoint names is a lottery. The app's own JS bundle,
// however, contains the paths it calls. We read them out of it, rank them, and
// probe the plausible ones. The winner is cached so later refreshes skip
// straight to it instead of re-downloading a multi-megabyte bundle.
// ============================================================================

/** Script URLs in the page that look like an app bundle (not vendor CSS/JS). */
function bundleUrls(html) {
  const out = [];
  const re = /<script[^>]+src=["']([^"']+\.js)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const src = m[1];
    // Skip well-known vendor scripts — the app's own calls won't be in them.
    if (/bootstrap|jquery|gtag|analytics|polyfill|recaptcha/i.test(src)) continue;
    out.push(absoluteUrl(src));
  }
  return out;
}

function absoluteUrl(src) {
  if (/^https?:\/\//i.test(src)) return src;
  return CONFIG.siteUrl + (src.startsWith("/") ? src : `/${src}`);
}

const IGNORED_HOSTS = /fonts\.|googleapis|gstatic|schema\.org|w3\.org|github|sentry|google-analytics|facebook|twitter|cloudflare|jsdelivr|unpkg/i;

/** Pull candidate API paths and hosts out of a JS bundle's string literals. */
function apiCandidatesFromBundle(js) {
  const paths = new Set();
  const hosts = new Set();

  // Same-origin API paths, e.g. "/api/masajid/timings".
  const pathRe = /["'`](\/api\/[A-Za-z0-9_\-./]*)["'`]/g;
  let m;
  while ((m = pathRe.exec(js)) !== null) paths.add(m[1].replace(/\/+$/, ""));

  // A separately hosted API, e.g. "https://api.example.com".
  const urlRe = /["'`](https?:\/\/[A-Za-z0-9.\-]+(?::\d+)?(?:\/[A-Za-z0-9_\-./]*)?)["'`]/g;
  while ((m = urlRe.exec(js)) !== null) {
    const u = m[1];
    if (IGNORED_HOSTS.test(u)) continue;
    if (/\/api\b/i.test(u) || /^https?:\/\/(api|backend|server|data)\./i.test(u)) {
      hosts.add(u.replace(/\/+$/, ""));
    }
  }

  return { paths: [...paths], hosts: [...hosts] };
}

/**
 * Snippets of bundle source around each mention of "Authorization", which is
 * where an app reveals how it builds that header.
 */
function authContextFromBundle(js, max = 6, radius = 220) {
  const out = [];
  const re = /Authorization/g;
  let m;
  while ((m = re.exec(js)) !== null && out.length < max) {
    const from = Math.max(0, m.index - radius);
    out.push(js.slice(from, m.index + radius).replace(/\s+/g, " "));
  }
  return out;
}

// Words that suggest an endpoint carries what we want, best first.
const ENDPOINT_HINTS = [
  /timing|prayer|salah|salaah|namaz|jamaat|jamaah|iqamah/i,
  /masjid|masajid|mosque/i,
  /today|schedule|time/i,
];

/** Most-likely-useful endpoints first; drop templated ones we can't fill in. */
function rankEndpoints(paths) {
  return paths
    .filter((p) => !/[${}:*]|\bundefined\b/.test(p))
    .map((p) => {
      let score = ENDPOINT_HINTS.length;
      for (let i = 0; i < ENDPOINT_HINTS.length; i++) {
        if (ENDPOINT_HINTS[i].test(p)) { score = i; break; }
      }
      return { path: p, score };
    })
    .sort((a, b) => a.score - b.score || a.path.length - b.path.length)
    .map((e) => e.path);
}

/**
 * Fetch the app bundle, extract endpoints, and probe them for prayer times.
 * Returns { schedule, apiUrl } so the caller can remember what worked.
 */
async function discoverViaBundle(html, log, maxProbes = 14) {
  const bundles = bundleUrls(html);
  if (!bundles.length) {
    log("bundle scan: no app bundle found in the page");
    return null;
  }

  const found = { paths: [], hosts: [] };
  for (const url of bundles.slice(0, 3)) {
    try {
      const { body } = await fetchText(url);
      const c = apiCandidatesFromBundle(body);
      found.paths.push(...c.paths);
      found.hosts.push(...c.hosts);
      log(`bundle ${url} -> ${body.length} bytes, ${c.paths.length} api paths, ${c.hosts.length} hosts`);
    } catch (e) {
      log(`bundle ${url} failed: ${e.message}`);
    }
  }

  const ranked = rankEndpoints([...new Set(found.paths)]);
  const hostRoots = [...new Set(found.hosts)];
  log(`bundle scan: ${ranked.length} probeable endpoints, ${hostRoots.length} api hosts`);

  // Same-origin paths first, then any dedicated API host we spotted.
  const targets = ranked.slice(0, maxProbes).map((p) => CONFIG.siteUrl + p);
  for (const h of hostRoots.slice(0, 4)) {
    if (!targets.includes(h)) targets.push(h);
  }

  for (const url of targets) {
    try {
      const { body, status } = await fetchText(url);
      if (!body || body.trim().startsWith("<")) {
        log(`  probe ${url} -> HTTP ${status}, not JSON`);
        continue;
      }
      const schedule = scheduleFromJson(JSON.parse(body));
      log(`  probe ${url} -> HTTP ${status}, ${schedule ? "MATCHED" : "JSON, no times"}`);
      if (schedule) {
        schedule.detail = `bundle ${url} ${schedule.detail}`;
        return { schedule, apiUrl: url };
      }
    } catch (e) {
      log(`  probe ${url} failed: ${e.message}`);
    }
  }

  return null;
}

// ============================================================================
// NETWORK
// ============================================================================

function pageUrl() {
  const override = (args.widgetParameter || "").trim();
  const path = override || CONFIG.pagePath || "";
  if (/^https?:\/\//i.test(path)) return path;
  return CONFIG.siteUrl + (path.startsWith("/") || path === "" ? path : `/${path}`);
}

async function fetchText(url, extraHeaders) {
  const req = new Request(url);
  req.timeoutInterval = CONFIG.timeout;
  req.headers = Object.assign({
    // Ask for the server-rendered page a browser would receive.
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    "Accept-Language": "en",
  }, extraHeaders || {});
  const body = await req.loadString();
  return { body, status: req.response ? req.response.statusCode : null };
}

/**
 * Resolve today's schedule, trying each strategy in turn.
 * `trace` collects a human-readable log for the diagnostic report.
 */
async function loadSchedule(trace) {
  const log = (line) => { if (trace) trace.push(line); };

  // 1. A known endpoint — either configured, or remembered from an earlier
  //    bundle scan. Either way this skips all discovery, so the common case
  //    is a single request.
  const savedAuth = loadDiscoveredAuth();
  const known = [];
  if (CONFIG.apiUrl) known.push(["apiUrl", CONFIG.apiUrl]);
  const remembered = loadDiscoveredApi();
  if (remembered && remembered !== CONFIG.apiUrl) known.push(["remembered", remembered]);

  for (const [label, url] of known) {
    try {
      const { body, status } = await fetchText(url, savedAuth ? { Authorization: savedAuth } : null);
      log(`${label} ${url} -> HTTP ${status}, ${body.length} bytes`);
      const schedule = scheduleFromJson(JSON.parse(body));
      if (schedule) {
        schedule.detail = `${label} ${schedule.detail}`;
        return schedule;
      }
      log(`${label}: responded, but no prayer times recognised in it`);
    } catch (e) {
      log(`${label} failed: ${e.message}`);
    }
  }

  // 2-5. The HTML page and everything embedded in it.
  const url = pageUrl();
  let html = null;
  try {
    const res = await fetchText(url);
    html = res.body;
    log(`page ${url} -> HTTP ${res.status}, ${html.length} bytes`);
  } catch (e) {
    log(`page ${url} failed: ${e.message}`);
  }

  if (html) {
    const strategies = [
      ["__NEXT_DATA__", scheduleFromNextData],
      ["__next_f (RSC)", scheduleFromFlight],
      ["inline JSON", scheduleFromInlineJson],
      ["HTML text", scheduleFromHtmlText],
    ];
    for (const [name, fn] of strategies) {
      try {
        const schedule = fn(html);
        if (schedule) {
          log(`strategy ${name}: MATCHED -> ${schedule.detail}`);
          return schedule;
        }
        log(`strategy ${name}: no match`);
      } catch (e) {
        log(`strategy ${name}: error ${e.message}`);
      }
    }
  }

  // 6. The authenticated list-then-timings handshake. Cheap to attempt (one
  //    request) and a no-op on any site without that masjid list.
  try {
    const viaAuth = await discoverViaAuthApi(log);
    if (viaAuth) {
      saveDiscoveredApi(viaAuth.apiUrl);
      saveDiscoveredAuth(viaAuth.auth);
      return viaAuth.schedule;
    }
  } catch (e) {
    log(`auth api error: ${e.message}`);
  }

  // 7. Read the endpoints out of the app's own JS bundle. This is the one that
  //    works for a client-rendered SPA, where the HTML carries no data and
  //    guessing endpoint names is hopeless.
  if (html) {
    try {
      const discovered = await discoverViaBundle(html, log);
      if (discovered) {
        saveDiscoveredApi(discovered.apiUrl);
        return discovered.schedule;
      }
    } catch (e) {
      log(`bundle scan error: ${e.message}`);
    }
  }

  // 7. Last resort: probe common endpoint names.
  for (const path of API_CANDIDATES) {
    const candidate = CONFIG.siteUrl + path;
    try {
      const { body, status } = await fetchText(candidate);
      if (!body || body.trim().startsWith("<")) {
        log(`probe ${path} -> HTTP ${status}, not JSON`);
        continue;
      }
      const schedule = scheduleFromJson(JSON.parse(body));
      log(`probe ${path} -> HTTP ${status}, ${schedule ? "MATCHED" : "JSON but no times"}`);
      if (schedule) {
        schedule.detail = `probe ${path} ${schedule.detail}`;
        return schedule;
      }
    } catch (e) {
      log(`probe ${path} failed: ${e.message}`);
    }
  }

  return null;
}

// ============================================================================
// AUTHENTICATED API (the MIS Masajid shape)
//
// The target site's timings endpoints exist but answer
//   HTTP 400 {"error":"Authorization header is missing"}
// while its masjid list is public and carries a per-masjid `username`. So the
// handshake is: list the masajid, pick one, then call the timings endpoint
// presenting that masjid's identifier as the Authorization header.
//
// The exact header format is not documented, so we try the plausible ones and
// remember whichever the server accepts.
// ============================================================================

const MIS = {
  list: "/api/v1/masjid/all",
  timings: ["/api/v1/timings/today", "/api/v1/timings/fixed-times"],
};

// Set when discovery fails for a reason worth showing the user verbatim —
// currently only "the masjid you named isn't in the list".
let DISCOVERY_NOTE = null;

// Fields on a masjid record that could serve as its identifier.
const ID_FIELDS = ["username", "id", "_id", "masjidId", "uid", "slug", "code"];

function masjidLabel(m) {
  for (const k of ["engName", "name", "masjidName", "title", "username"]) {
    if (typeof m[k] === "string" && m[k].trim()) return m[k].trim();
  }
  return "Masjid";
}

/**
 * Fold a name down for forgiving comparison: lowercase, drop everything that
 * isn't alphanumeric, and collapse repeated letters. That way "Mudasir",
 * "Mudassir" and "masjid-e-mudassir" all compare equal on the same stem —
 * transliterated names rarely agree on doubled consonants or punctuation.
 */
function normalizeName(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/(.)\1+/g, "$1");
}

function masjidFields(m) {
  return [m.username, m.engName, m.name, m.masjidName].filter((v) => typeof v === "string" && v);
}

/**
 * Accept a masjid's page URL wherever a name is expected — copying the link
 * from the site is the obvious thing to reach for, so pull the slug out of
 * ".../masjid/<slug>" rather than failing to match the whole URL.
 */
function masjidKeyFromInput(raw) {
  const s = String(raw || "").trim();
  const m = s.match(/\/masjid\/([^/?#\s]+)/i);
  return m ? m[1] : s;
}

/** The masjid named by the widget parameter or CONFIG.masjid; first if unset. */
function pickMasjid(list) {
  const override = (args.widgetParameter || "").trim();
  const want = masjidKeyFromInput(override || CONFIG.masjid || "");
  if (!want) return list[0];

  const target = normalizeName(want);
  if (!target) return list[0];

  // An exact name beats a partial one, so "Hamza" can't be stolen by a longer
  // name that merely contains it.
  const exact = list.find((m) => masjidFields(m).some((v) => normalizeName(v) === target));
  if (exact) return exact;

  return list.find((m) => masjidFields(m).some((v) => normalizeName(v).includes(target))) || null;
}

/** Authorization header values worth trying for a given masjid. */
function authCandidates(m) {
  const values = [];
  const add = (v) => { if (v && !values.includes(v)) values.push(v); };
  for (const k of ID_FIELDS) {
    const v = m[k];
    if (typeof v !== "string" || !v) continue;
    add(v);
    add(`Bearer ${v}`);
  }
  return values;
}

/**
 * List the masajid, pick one, and call the timings endpoints with each
 * plausible Authorization value until the server accepts one.
 * Returns { schedule, apiUrl, auth } so the working combination can be cached.
 */
async function discoverViaAuthApi(log) {
  let list;
  try {
    const { body, status } = await fetchText(CONFIG.siteUrl + MIS.list);
    list = JSON.parse(body);
    log(`masjid list -> HTTP ${status}, ${Array.isArray(list) ? `${list.length} entries` : "not an array"}`);
  } catch (e) {
    log(`masjid list failed: ${e.message}`);
    return null;
  }
  if (!Array.isArray(list) || !list.length) return null;

  const chosen = pickMasjid(list);
  if (!chosen) {
    // A typo'd masjid name should say so, not fall through to a generic
    // "couldn't read the site" — the user needs to know which names exist.
    const wanted = (args.widgetParameter || "").trim() || CONFIG.masjid;
    DISCOVERY_NOTE = `No masjid matching "${wanted}". Available: ${
      list.slice(0, 8).map(masjidLabel).join(", ")
    }${list.length > 8 ? `, +${list.length - 8} more` : ""}`;
    log(DISCOVERY_NOTE);
    return null;
  }
  log(`masjid: ${masjidLabel(chosen)}`);

  const candidates = authCandidates(chosen);
  if (!candidates.length) {
    log("masjid record carries no usable identifier");
    return null;
  }

  for (const path of MIS.timings) {
    const url = CONFIG.siteUrl + path;
    for (const auth of candidates) {
      try {
        const { body, status } = await fetchText(url, { Authorization: auth });
        if (status && status >= 400) {
          log(`  ${path} auth="${auth}" -> HTTP ${status}`);
          continue;
        }
        const schedule = scheduleFromJson(JSON.parse(body));
        log(`  ${path} auth="${auth}" -> HTTP ${status}, ${schedule ? "MATCHED" : "JSON but no times"}`);
        if (schedule) {
          if (!schedule.masjid) schedule.masjid = masjidLabel(chosen);
          schedule.detail = `mis ${path}`;
          return { schedule, apiUrl: url, auth };
        }
      } catch (e) {
        log(`  ${path} auth="${auth}" failed: ${e.message}`);
      }
    }
  }

  return null;
}

// ============================================================================
// CACHE — so the widget still shows something when offline or rate-limited.
// ============================================================================

function cachePath() {
  const fm = FileManager.local();
  return fm.joinPath(fm.documentsDirectory(), CACHE_FILE);
}

function readCacheFile() {
  try {
    const fm = FileManager.local();
    const path = cachePath();
    if (!fm.fileExists(path)) return {};
    return JSON.parse(fm.readString(path)) || {};
  } catch (e) {
    return {};
  }
}

function writeCacheFile(patch) {
  try {
    const fm = FileManager.local();
    fm.writeString(cachePath(), JSON.stringify({ ...readCacheFile(), ...patch }));
  } catch (e) { /* cache is best-effort */ }
}

function saveCache(schedule) {
  writeCacheFile({ savedAt: new Date().toISOString(), schedule });
}

/** The endpoint a previous bundle scan found, so we only pay for that once. */
function loadDiscoveredApi() {
  const c = readCacheFile();
  return typeof c.discoveredApi === "string" ? c.discoveredApi : null;
}

function saveDiscoveredApi(url) {
  if (url) writeCacheFile({ discoveredApi: url });
}

/** The Authorization value the server accepted, if the endpoint needed one. */
function loadDiscoveredAuth() {
  const c = readCacheFile();
  return typeof c.discoveredAuth === "string" ? c.discoveredAuth : null;
}

function saveDiscoveredAuth(auth) {
  if (auth) writeCacheFile({ discoveredAuth: auth });
}

function loadCache() {
  const parsed = readCacheFile();
  return parsed && parsed.schedule ? parsed : null;
}

// ============================================================================
// NEXT PRAYER
// ============================================================================

/** Which time do we count down to for a given prayer? */
function targetMinutes(prayer) {
  if (CONFIG.countdownTo === "jamaat" && prayer.jamaat != null) return prayer.jamaat;
  if (prayer.start != null) return prayer.start;
  return prayer.jamaat;
}

/**
 * The next prayer after `now`. If every prayer has passed, the next one is
 * tomorrow's Fajr, and the countdown wraps across midnight.
 */
function nextPrayer(schedule, now) {
  const nowMinutes = dateToMinutes(now);
  const usable = schedule.prayers.filter((p) => targetMinutes(p) != null);
  if (!usable.length) return null;

  for (const p of usable) {
    const t = targetMinutes(p);
    if (t > nowMinutes) {
      return { prayer: p, minutesAway: t - nowMinutes, tomorrow: false };
    }
  }

  const first = usable[0];
  return {
    prayer: first,
    minutesAway: 24 * 60 - nowMinutes + targetMinutes(first),
    tomorrow: true,
  };
}

// ============================================================================
// RENDERING
// ============================================================================

function addRule(stack) {
  const line = stack.addStack();
  line.size = new Size(0, 1);
  line.backgroundColor = THEME.rule;
}

function styled(container, text, { size, color, bold = false, opacity = 1 }) {
  const t = container.addText(text);
  t.font = bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  t.textColor = color;
  t.textOpacity = opacity;
  t.lineLimit = 1;
  t.minimumScaleFactor = 0.7;
  return t;
}

function buildWidget(schedule, next, stale) {
  const widget = new ListWidget();
  widget.setPadding(14, 14, 14, 14);

  const gradient = new LinearGradient();
  gradient.colors = [THEME.bgTop, THEME.bgBottom];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;

  const tap = CONFIG.tapUrl || pageUrl();
  if (tap) widget.url = tap;

  const family = config.widgetFamily || "medium";
  if (family === "small") renderSmall(widget, schedule, next, stale);
  else if (family === "large" || family === "extraLarge") renderLarge(widget, schedule, next, stale);
  else renderMedium(widget, schedule, next, stale);

  // Refresh at the next prayer, or on the normal cadence — whichever is sooner,
  // so the countdown never sits visibly stale through a prayer time.
  const now = new Date();
  const byCadence = new Date(now.getTime() + CONFIG.refreshMinutes * 60 * 1000);
  let refreshAt = byCadence;
  if (next) {
    const atPrayer = new Date(now.getTime() + (next.minutesAway + 1) * 60 * 1000);
    if (atPrayer < refreshAt) refreshAt = atPrayer;
  }
  widget.refreshAfterDate = refreshAt;

  return widget;
}

function headerText(schedule, stale) {
  const name = schedule.masjid || "Masjid";
  return stale ? `${name} · offline` : name;
}

function renderSmall(widget, schedule, next, stale) {
  styled(widget, headerText(schedule, stale), { size: 10, color: THEME.dim, bold: true });
  widget.addSpacer(6);

  if (next) {
    styled(widget, next.prayer.label.toUpperCase(), { size: 13, color: THEME.accent, bold: true });
    styled(widget, formatCountdown(next.minutesAway), { size: 26, color: THEME.text, bold: true });
    const at = targetMinutes(next.prayer);
    const label = next.tomorrow ? `${formatTime(at)} tmrw` : formatTime(at);
    styled(widget, label, { size: 12, color: THEME.dim });
  } else {
    styled(widget, "No times", { size: 16, color: THEME.text, bold: true });
  }

  widget.addSpacer();
  const hijri = hijriDate(new Date());
  if (hijri) styled(widget, hijri, { size: 9, color: THEME.gold, bold: true });
}

function renderMedium(widget, schedule, next, stale) {
  const row = widget.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();

  // Left: the headline — next prayer and countdown.
  const left = row.addStack();
  left.layoutVertically();
  left.size = new Size(120, 0);

  styled(left, headerText(schedule, stale), { size: 10, color: THEME.dim, bold: true });
  left.addSpacer(6);

  if (next) {
    styled(left, next.prayer.label.toUpperCase(), { size: 13, color: THEME.accent, bold: true });
    styled(left, formatCountdown(next.minutesAway), { size: 24, color: THEME.text, bold: true });
    const at = targetMinutes(next.prayer);
    styled(left, next.tomorrow ? `${formatTime(at)} tmrw` : formatTime(at), { size: 11, color: THEME.dim });
  } else {
    styled(left, "No times found", { size: 14, color: THEME.text, bold: true });
  }

  left.addSpacer();
  const hijri = hijriDate(new Date());
  if (hijri) styled(left, hijri, { size: 9, color: THEME.gold, bold: true });

  row.addSpacer(10);

  // Right: the full day. Only one time fits per row, so say which one it is —
  // "Fajr 5:30" is ambiguous between the adhan and the congregation.
  const right = row.addStack();
  right.layoutVertically();

  const showingJamaat = CONFIG.countdownTo === "jamaat" && schedule.prayers.some((p) => p.jamaat != null);
  const caption = right.addStack();
  caption.layoutHorizontally();
  caption.addSpacer();
  styled(caption, showingJamaat ? "JAMAAT" : "BEGINS", { size: 8, color: THEME.dim, bold: true });
  right.addSpacer(3);

  for (const p of schedule.prayers) {
    const isNext = next && next.prayer.key === p.key;
    const line = right.addStack();
    line.layoutHorizontally();

    styled(line, p.label, {
      size: 12,
      color: isNext ? THEME.accent : THEME.text,
      bold: isNext,
      opacity: isNext ? 1 : 0.85,
    });
    line.addSpacer();
    styled(line, formatTime(targetMinutes(p)), {
      size: 12,
      color: isNext ? THEME.accent : THEME.text,
      bold: isNext,
    });
    right.addSpacer(3);
  }
}

function renderLarge(widget, schedule, next, stale) {
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  styled(header, headerText(schedule, stale), { size: 14, color: THEME.text, bold: true });
  header.addSpacer();
  const hijri = hijriDate(new Date());
  if (hijri) styled(header, hijri, { size: 11, color: THEME.gold, bold: true });

  widget.addSpacer(10);

  if (next) {
    const banner = widget.addStack();
    banner.layoutVertically();
    styled(banner, `${next.prayer.label.toUpperCase()} ${next.tomorrow ? "· TOMORROW" : ""}`.trim(), {
      size: 12, color: THEME.accent, bold: true,
    });
    const line = banner.addStack();
    line.layoutHorizontally();
    line.bottomAlignContent();
    styled(line, formatCountdown(next.minutesAway), { size: 34, color: THEME.text, bold: true });
    line.addSpacer(8);
    styled(line, `at ${formatTime(targetMinutes(next.prayer))}`, { size: 13, color: THEME.dim });
    line.addSpacer();
  }

  widget.addSpacer(12);
  addRule(widget);
  widget.addSpacer(8);

  // Column headers only make sense when we actually have jamaat times.
  const hasJamaat = schedule.prayers.some((p) => p.jamaat != null);
  if (hasJamaat) {
    const head = widget.addStack();
    head.layoutHorizontally();
    styled(head, "PRAYER", { size: 9, color: THEME.dim, bold: true });
    head.addSpacer();
    styled(head, "BEGINS", { size: 9, color: THEME.dim, bold: true });
    head.addSpacer(28);
    styled(head, "JAMAAT", { size: 9, color: THEME.dim, bold: true });
    widget.addSpacer(6);
  }

  for (const p of schedule.prayers) {
    const isNext = next && next.prayer.key === p.key;
    const line = widget.addStack();
    line.layoutHorizontally();
    line.centerAlignContent();

    styled(line, p.label, {
      size: 15, color: isNext ? THEME.accent : THEME.text, bold: isNext,
    });
    line.addSpacer();
    styled(line, formatTime(p.start), {
      size: 15, color: isNext ? THEME.accent : THEME.text, bold: isNext,
      opacity: p.start == null ? 0.4 : 1,
    });
    if (hasJamaat) {
      line.addSpacer(24);
      styled(line, formatTime(p.jamaat), {
        size: 15, color: isNext ? THEME.accent : THEME.text, bold: isNext,
        opacity: p.jamaat == null ? 0.4 : 1,
      });
    }
    widget.addSpacer(7);
  }

  widget.addSpacer();
  if (stale) {
    styled(widget, "Showing last saved times — no connection", { size: 9, color: THEME.dim });
  }
}

/** Shown when nothing could be parsed at all. */
function buildErrorWidget(message) {
  const widget = new ListWidget();
  widget.setPadding(14, 14, 14, 14);
  const gradient = new LinearGradient();
  gradient.colors = [THEME.bgTop, THEME.bgBottom];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;

  styled(widget, "Prayer times", { size: 11, color: THEME.dim, bold: true });
  widget.addSpacer(6);
  const t = widget.addText(message);
  t.font = Font.systemFont(12);
  t.textColor = THEME.text;
  t.lineLimit = 4;
  widget.addSpacer(4);
  styled(widget, "Run the script in Scriptable to diagnose", { size: 9, color: THEME.dim });

  widget.url = pageUrl();
  widget.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  return widget;
}

// ============================================================================
// DIAGNOSTIC MODE
//
// Running the script inside Scriptable (rather than as a widget) produces a
// report of what each strategy saw, and copies it to the clipboard so it can
// be pasted to whoever is adapting the parser to this site.
// ============================================================================

/** Append every masjid the site lists, with the string that selects it. */
async function appendMasjidList(lines) {
  try {
    const r = await fetchText(CONFIG.siteUrl + MIS.list);
    const list = JSON.parse(r.body);
    lines.push("");
    lines.push(`--- masajid available (${Array.isArray(list) ? list.length : "?"}) ---`);
    if (!Array.isArray(list) || !list.length) return;

    lines.push('put either column into CONFIG.masjid or the widget Parameter:');
    lines.push("");
    for (const m of list.slice(0, 60)) {
      lines.push(`  ${masjidLabel(m)}   [${m.username || "no username"}]`);
    }
    lines.push("");
    lines.push("first record in full (field names for the parser):");
    lines.push(JSON.stringify(list[0], null, 1).slice(0, 1200));
  } catch (e) {
    lines.push(`masjid list failed: ${e.message}`);
  }
}

async function runDiagnostics() {
  const trace = [];
  const started = Date.now();
  const schedule = await loadSchedule(trace);
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  const lines = [];
  lines.push("=== Masjid widget diagnostic ===");
  lines.push(`when: ${new Date().toISOString()}`);
  lines.push(`site: ${CONFIG.siteUrl}`);
  lines.push(`page: ${pageUrl()}`);
  lines.push(`apiUrl: ${CONFIG.apiUrl || "(not set)"}`);
  lines.push(`elapsed: ${elapsed}s`);
  lines.push("");
  lines.push("--- strategy trace ---");
  lines.push(...trace);
  lines.push("");

  if (schedule) {
    lines.push("--- RESULT: times found ---");
    lines.push(`via: ${schedule.detail}`);
    lines.push(`masjid: ${schedule.masjid || "(none found)"}`);
    for (const p of schedule.prayers) {
      lines.push(`  ${p.label.padEnd(8)} begins ${formatTime(p.start).padEnd(9)} jamaat ${formatTime(p.jamaat)}`);
    }
    const next = nextPrayer(schedule, new Date());
    if (next) {
      lines.push(`next: ${next.prayer.label} in ${formatCountdown(next.minutesAway)}${next.tomorrow ? " (tomorrow)" : ""}`);
    }
  } else {
    lines.push("--- RESULT: NO TIMES FOUND ---");
    lines.push("None of the strategies recognised prayer times on this page.");
    lines.push("The page sample below shows what the site actually returned —");
    lines.push("paste this whole report back so the parser can be pointed at it.");
    lines.push("");
    try {
      const { body } = await fetchText(pageUrl());
      lines.push("--- first 1200 chars of page ---");
      lines.push(body.slice(0, 1200));
      lines.push("");

      // For a client-rendered app the page tells us nothing, but its bundle
      // names every endpoint the app calls. Dump those and what they return.
      const bundles = bundleUrls(body);
      lines.push(`--- app bundles (${bundles.length}) ---`);
      lines.push(bundles.join("\n") || "(none)");
      lines.push("");

      for (const b of bundles.slice(0, 2)) {
        try {
          const js = await fetchText(b);
          const c = apiCandidatesFromBundle(js.body);
          lines.push(`--- ${b} (${js.body.length} bytes) ---`);
          lines.push(`api paths (${c.paths.length}):`);
          lines.push(c.paths.slice(0, 60).join("\n") || "(none)");
          lines.push(`api hosts (${c.hosts.length}):`);
          lines.push(c.hosts.slice(0, 20).join("\n") || "(none)");
          lines.push("");

          lines.push("--- what the top endpoints return ---");
          for (const p of rankEndpoints(c.paths).slice(0, 8)) {
            const url = CONFIG.siteUrl + p;
            try {
              const r = await fetchText(url);
              lines.push(`${p} -> HTTP ${r.status}: ${r.body.slice(0, 240).replace(/\s+/g, " ")}`);
            } catch (e) {
              lines.push(`${p} -> ${e.message}`);
            }
          }
          lines.push("");

          // How does the app build its Authorization header?
          const auth = authContextFromBundle(js.body);
          lines.push(`--- "Authorization" in the bundle (${auth.length} shown) ---`);
          lines.push(auth.join("\n---\n") || "(not found)");
        } catch (e) {
          lines.push(`bundle ${b} failed: ${e.message}`);
        }
      }

    } catch (e) {
      lines.push(`could not re-fetch page for sample: ${e.message}`);
    }
  }

  // Always list the masajid, success or failure — this is how you find the
  // exact name to put in CONFIG.masjid or a widget's Parameter field.
  await appendMasjidList(lines);

  const report = lines.join("\n");
  console.log(report);
  Pasteboard.copy(report);

  const alert = new Alert();
  alert.title = schedule ? "Times found ✓" : "No times found";
  alert.message = schedule
    ? `Parsed via ${schedule.detail}.\n\nThe full report is on your clipboard. Add the widget to your home screen.`
    : "The full diagnostic report has been copied to your clipboard. Paste it back so the parser can be adapted to this site.";
  alert.addAction("OK");
  await alert.present();

  // Preview whatever we have, so the layout can be eyeballed too.
  if (schedule) {
    const widget = buildWidget(schedule, nextPrayer(schedule, new Date()), false);
    await widget.presentMedium();
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  if (!config.runsInWidget) {
    await runDiagnostics();
    Script.complete();
    return;
  }

  let schedule = null;
  let stale = false;

  try {
    schedule = await loadSchedule(null);
  } catch (e) {
    console.log(`load failed: ${e.message}`);
  }

  if (schedule) {
    saveCache(schedule);
  } else {
    const cached = loadCache();
    if (cached) {
      schedule = cached.schedule;
      stale = true;
    }
  }

  const widget = schedule
    ? buildWidget(schedule, nextPrayer(schedule, new Date()), stale)
    : buildErrorWidget(DISCOVERY_NOTE || "Couldn't read prayer times from the site.");

  Script.setWidget(widget);
  Script.complete();
}

await main();
