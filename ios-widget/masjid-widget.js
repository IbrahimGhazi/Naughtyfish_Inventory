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

  // Page to read times from, relative to siteUrl. If the site has a page per
  // masjid, put that path here (e.g. "/masjid/al-noor"). Can be overridden
  // per-widget with the widget parameter (long-press widget -> Edit Widget).
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
// NETWORK
// ============================================================================

function pageUrl() {
  const override = (args.widgetParameter || "").trim();
  const path = override || CONFIG.pagePath || "";
  if (/^https?:\/\//i.test(path)) return path;
  return CONFIG.siteUrl + (path.startsWith("/") || path === "" ? path : `/${path}`);
}

async function fetchText(url) {
  const req = new Request(url);
  req.timeoutInterval = CONFIG.timeout;
  req.headers = {
    // Ask for the server-rendered page a browser would receive.
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    "Accept-Language": "en",
  };
  const body = await req.loadString();
  return { body, status: req.response ? req.response.statusCode : null };
}

/**
 * Resolve today's schedule, trying each strategy in turn.
 * `trace` collects a human-readable log for the diagnostic report.
 */
async function loadSchedule(trace) {
  const log = (line) => { if (trace) trace.push(line); };

  // 1. Explicit API endpoint.
  if (CONFIG.apiUrl) {
    try {
      const { body, status } = await fetchText(CONFIG.apiUrl);
      log(`apiUrl ${CONFIG.apiUrl} -> HTTP ${status}, ${body.length} bytes`);
      const schedule = scheduleFromJson(JSON.parse(body));
      if (schedule) {
        schedule.detail = `apiUrl ${schedule.detail}`;
        return schedule;
      }
      log("apiUrl: responded, but no prayer times recognised in it");
    } catch (e) {
      log(`apiUrl failed: ${e.message}`);
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

  // 6. Probe common JSON endpoints — for a fully client-rendered app.
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
// CACHE — so the widget still shows something when offline or rate-limited.
// ============================================================================

function cachePath() {
  const fm = FileManager.local();
  return fm.joinPath(fm.documentsDirectory(), CACHE_FILE);
}

function saveCache(schedule) {
  try {
    const fm = FileManager.local();
    fm.writeString(cachePath(), JSON.stringify({
      savedAt: new Date().toISOString(),
      schedule,
    }));
  } catch (e) { /* cache is best-effort */ }
}

function loadCache() {
  try {
    const fm = FileManager.local();
    const path = cachePath();
    if (!fm.fileExists(path)) return null;
    const parsed = JSON.parse(fm.readString(path));
    if (!parsed || !parsed.schedule) return null;
    return parsed;
  } catch (e) {
    return null;
  }
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
      lines.push("--- first 2500 chars of page ---");
      lines.push(body.slice(0, 2500));
      lines.push("");
      const scripts = body.match(/<script[^>]*src=["']([^"']+)["']/gi) || [];
      lines.push(`--- ${scripts.length} external scripts ---`);
      lines.push(scripts.slice(0, 25).join("\n"));
    } catch (e) {
      lines.push(`could not re-fetch page for sample: ${e.message}`);
    }
  }

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
    : buildErrorWidget("Couldn't read prayer times from the site.");

  Script.setWidget(widget);
  Script.complete();
}

await main();
