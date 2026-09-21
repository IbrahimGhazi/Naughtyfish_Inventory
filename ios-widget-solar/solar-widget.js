// ============================================================================
// Solar Monitor — iOS home screen widget for Scriptable
//
// Live inverter figures for the Emergy solar monitor: PV output now, house
// load, battery state of charge, grid import/export, grid-outage status and
// today's generation. Runs in the free Scriptable app — no Mac, no Xcode, no
// Apple Developer account.
//
//   Install:  see ios-widget-solar/README.md
//   Sign in:  run this script INSIDE Scriptable -> "Sign in / change account"
//   Data:     Supabase REST, scoped by row-level security to your own device
//
// CREDENTIALS ARE NEVER STORED IN THIS FILE. Your email and password live in
// the iOS Keychain on your phone, written only by the sign-in prompt. This
// file is safe to commit to a public repository.
// ============================================================================

// ----------------------------------------------------------------------------
// CONFIG
// ----------------------------------------------------------------------------
const CONFIG = {
  // Backend. These two are public by design: the anon key is the same one the
  // web app ships to every browser, and it grants nothing on its own — every
  // table is guarded by row-level security keyed to your signed-in user.
  supabaseUrl: "https://jgeekrtfhfbncnkifojz.supabase.co",
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnZWVrcnRmaGZibmNua2lmb2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODkxMzQsImV4cCI6MjA5NjU2NTEzNH0.v2C05ckwPmJPw_xITVJcyEjoR_PP6QPcvx93GNJcwYE",

  // Which inverter to show, matched against the device name (e.g. "Emergy").
  // Empty uses the first device your account can see. Override per-widget with
  // the widget parameter (long-press widget -> Edit Widget -> Parameter).
  device: "",

  // Treat readings older than this as stale and say so on the widget.
  staleAfterMinutes: 20,

  // Draw today's solar curve. Costs one extra request against snapshots_5min,
  // which sits behind exactly the same row-level security as the live reading,
  // so it needs no additional access. Set false for a figures-only widget.
  showChart: true,

  // How often iOS is asked to refresh. The inverter reports every 5 minutes,
  // so there is nothing to gain from asking more often than that.
  refreshMinutes: 5,

  timeout: 20,
};

// Keychain keys. Values never leave the device.
const KEY = {
  email: "solar.email",
  password: "solar.password",
  refresh: "solar.refresh_token",
  access: "solar.access_token",
  expires: "solar.expires_at",
};

const CACHE_FILE = "solar-widget-cache.json";

const THEME = {
  bgTop: Color.dynamic(new Color("#fbfaf5"), new Color("#141207")),
  bgBottom: Color.dynamic(new Color("#f2eee0"), new Color("#0b0a04")),
  text: Color.dynamic(new Color("#23200f"), new Color("#f4f1e4")),
  dim: Color.dynamic(new Color("#6d6852"), new Color("#a49d83")),
  sun: Color.dynamic(new Color("#b8860b"), new Color("#f5c542")),
  good: Color.dynamic(new Color("#1d7a4c"), new Color("#48d38c")),
  warn: Color.dynamic(new Color("#a8410f"), new Color("#ff9d5c")),
  bad: Color.dynamic(new Color("#a11d1d"), new Color("#ff6b6b")),
  rule: Color.dynamic(new Color("#00000012"), new Color("#ffffff14")),
};

/*
 * Chart series colours, as raw hex per appearance.
 *
 * These can't be Color.dynamic like THEME: a chart is rasterised by
 * DrawContext into a bitmap, which bakes in whatever colour it resolved at
 * draw time and cannot re-resolve when the system flips appearance. So the
 * mode is read once, up front, and the matching hex used for both the plotted
 * marks and the legend dots — keeping the two in agreement, which matters more
 * than a dot that follows a theme switch before the next refresh.
 *
 * Both pairs are checked against this widget's own surfaces (#f2eee0 light,
 * #141207 dark) for lightness, chroma, colour-blind separation and contrast.
 * The amber is deliberately a step darker than THEME.sun — that lighter gold
 * is right for a 34pt number and too light to read as a 2pt line.
 */
const SERIES = {
  solar: { light: "#a67a0a", dark: "#c98500" },
  load: { light: "#2a78d6", dark: "#3987e5" },
};

function darkAppearance() {
  try {
    return Device.isUsingDarkAppearance() === true;
  } catch (e) {
    return false;
  }
}

const seriesHex = (name, dark) => SERIES[name][dark ? "dark" : "light"];

// ============================================================================
// FORMATTING
// ============================================================================

/** Watts -> "1.34 kW" / "820 W". Handles negatives and nulls. */
function formatPower(watts) {
  if (watts == null || isNaN(watts)) return "—";
  const abs = Math.abs(watts);
  if (abs >= 1000) {
    const kw = watts / 1000;
    return `${kw >= 10 || kw <= -10 ? kw.toFixed(1) : kw.toFixed(2)} kW`;
  }
  return `${Math.round(watts)} W`;
}

function formatEnergy(kwh) {
  if (kwh == null || isNaN(kwh)) return "—";
  return `${kwh >= 100 ? Math.round(kwh) : kwh.toFixed(1)} kWh`;
}

function formatPercent(pct) {
  if (pct == null || isNaN(pct)) return "—";
  return `${Math.round(pct)}%`;
}

/** "3m ago" / "2h 5m ago" — how old the inverter reading is. */
function formatAge(minutes) {
  if (minutes == null) return "unknown";
  if (minutes < 1) return "just now";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h <= 0) return `${m}m ago`;
  return m === 0 ? `${h}h ago` : `${h}h ${m}m ago`;
}

const num = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};

// ============================================================================
// KEYCHAIN / CREDENTIALS
// ============================================================================

function kcGet(key) {
  try {
    return Keychain.contains(key) ? Keychain.get(key) : null;
  } catch (e) {
    return null;
  }
}

function kcSet(key, value) {
  try {
    if (value == null || value === "") Keychain.remove(key);
    else Keychain.set(key, String(value));
  } catch (e) { /* keychain unavailable — treated as signed out */ }
}

function hasCredentials() {
  return Boolean(kcGet(KEY.email) && kcGet(KEY.password)) || Boolean(kcGet(KEY.refresh));
}

function clearSession() {
  for (const k of [KEY.refresh, KEY.access, KEY.expires]) kcSet(k, null);
}

function signOut() {
  for (const k of Object.values(KEY)) kcSet(k, null);
}

// ============================================================================
// HTTP
// ============================================================================

async function request(url, { method = "GET", headers = {}, body = null } = {}) {
  const req = new Request(url);
  req.method = method;
  req.timeoutInterval = CONFIG.timeout;

  // Build the header dictionary completely, THEN assign it once. Scriptable's
  // `req.headers` getter hands back a copy, so mutating it after assignment
  // (req.headers["Content-Type"] = …) is silently discarded — which drops the
  // JSON content type and makes the server reject the body as unparseable.
  const allHeaders = Object.assign(
    { apikey: CONFIG.anonKey, Accept: "application/json" },
    headers
  );
  if (body != null) allHeaders["Content-Type"] = "application/json";
  req.headers = allHeaders;

  if (body != null) req.body = JSON.stringify(body);

  const text = await req.loadString();
  const status = req.response ? req.response.statusCode : 0;
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { /* non-JSON error page */ }
  return { status, json, text };
}

// ============================================================================
// AUTH  (Supabase email/password grant)
//
// Order of preference: a live access token, then the refresh token, then the
// stored password. Only the last one needs the password, so a normal refresh
// never sends it.
// ============================================================================

function storeSession(json) {
  if (!json || !json.access_token) return false;
  kcSet(KEY.access, json.access_token);
  if (json.refresh_token) kcSet(KEY.refresh, json.refresh_token);
  const ttl = Number(json.expires_in) || 3600;
  kcSet(KEY.expires, String(Date.now() + ttl * 1000));
  return true;
}

function liveAccessToken() {
  const token = kcGet(KEY.access);
  const expires = Number(kcGet(KEY.expires) || 0);
  // 60s of slack so a token doesn't expire mid-request.
  return token && expires > Date.now() + 60000 ? token : null;
}

async function signInWithPassword(email, password, log) {
  const res = await request(`${CONFIG.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    body: { email, password },
  });
  if (res.status === 200 && storeSession(res.json)) {
    log(`password grant: ok`);
    return { ok: true };
  }
  // Never log the password; the server's message is enough to act on.
  const msg = (res.json && (res.json.error_description || res.json.msg || res.json.error)) || `HTTP ${res.status}`;
  log(`password grant failed: ${msg}`);
  return { ok: false, error: msg, status: res.status };
}

async function refreshSession(log) {
  const refresh = kcGet(KEY.refresh);
  if (!refresh) return { ok: false, error: "no refresh token" };
  const res = await request(`${CONFIG.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    body: { refresh_token: refresh },
  });
  if (res.status === 200 && storeSession(res.json)) {
    log("refresh: ok");
    return { ok: true };
  }
  log(`refresh failed: HTTP ${res.status}`);
  clearSession();
  return { ok: false, error: `HTTP ${res.status}` };
}

/** A usable bearer token, refreshing or re-signing-in as needed. */
async function getAccessToken(log) {
  const live = liveAccessToken();
  if (live) {
    log("using cached access token");
    return { ok: true, token: live };
  }

  const refreshed = await refreshSession(log);
  if (refreshed.ok) return { ok: true, token: kcGet(KEY.access) };

  const email = kcGet(KEY.email);
  const password = kcGet(KEY.password);
  if (!email || !password) {
    return { ok: false, error: "Not signed in. Open the script in Scriptable to sign in." };
  }

  const signed = await signInWithPassword(email, password, log);
  if (signed.ok) return { ok: true, token: kcGet(KEY.access) };
  return { ok: false, error: `Sign-in failed: ${signed.error}` };
}

// ============================================================================
// DATA
//
// Both tables are RLS-guarded. `devices` needs only device membership, while
// `device_status` additionally requires an unexpired subscription — so if
// devices returns rows and device_status does not, the subscription has
// lapsed. That distinction is worth showing instead of an empty widget.
// ============================================================================

async function rest(path, token) {
  return request(`${CONFIG.supabaseUrl}/rest/v1/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function pickDevice(devices) {
  const want = ((args.widgetParameter || "").trim() || CONFIG.device || "").trim().toLowerCase();
  if (!want) return devices[0];
  return (
    devices.find((d) => String(d.name || "").toLowerCase() === want) ||
    devices.find((d) => String(d.name || "").toLowerCase().includes(want)) ||
    null
  );
}

async function loadReading(log) {
  const auth = await getAccessToken(log);
  if (!auth.ok) return { error: auth.error };
  const token = auth.token;

  const devRes = await rest("devices?select=id,name,subscription_until,last_seen", token);
  log(`devices -> HTTP ${devRes.status}, ${Array.isArray(devRes.json) ? devRes.json.length : "?"} row(s)`);

  if (devRes.status === 401) {
    // Token rejected outright — drop it so the next run signs in cleanly.
    clearSession();
    return { error: "Session rejected. Open the script to sign in again." };
  }
  // A transport or server failure must not be reported as an account problem —
  // that sends you looking for the fault in entirely the wrong place.
  if (devRes.status !== 200) {
    return { error: `Can't reach the server (HTTP ${devRes.status || "no response"}).` };
  }
  if (!Array.isArray(devRes.json) || !devRes.json.length) {
    return { error: "No solar device is linked to this account." };
  }

  const device = pickDevice(devRes.json);
  if (!device) {
    return {
      error: `No device matching "${(args.widgetParameter || "").trim() || CONFIG.device}". Available: ${
        devRes.json.map((d) => d.name).join(", ")
      }`,
    };
  }

  const statusRes = await rest(
    `device_status?device_id=eq.${device.id}&select=inverter_ok,updated_at,last_good_at,latest`,
    token
  );
  log(`device_status -> HTTP ${statusRes.status}, ${Array.isArray(statusRes.json) ? statusRes.json.length : "?"} row(s)`);

  if (statusRes.status !== 200) {
    return { error: `Can't reach the server (HTTP ${statusRes.status || "no response"}).` };
  }
  if (!Array.isArray(statusRes.json) || !statusRes.json.length) {
    // devices was readable but status was not: the subscription gate is the
    // documented reason for exactly this asymmetry.
    const until = device.subscription_until ? new Date(device.subscription_until) : null;
    if (until && until.getTime() < Date.now()) {
      return { error: `Subscription expired ${until.toISOString().slice(0, 10)} — renew to see live data.` };
    }
    return { error: "No live data for this device yet." };
  }

  const reading = shapeReading(device, statusRes.json[0]);

  // The chart is an enhancement, never a requirement: if the history request
  // fails the figures are still good, so it degrades to a widget without one
  // rather than reporting an error over a working reading.
  if (CONFIG.showChart) {
    try {
      reading.series = await loadSeries(device.id, token, log);
    } catch (e) {
      log(`snapshots failed: ${e.message}`);
    }
  }

  return { reading };
}

/**
 * Flatten the `latest` JSON blob into the handful of figures the widget shows.
 * Everything is optional — the inverter omits fields depending on its model.
 */
function shapeReading(device, row) {
  const l = row.latest || {};
  const updatedAt = row.updated_at ? new Date(row.updated_at) : null;
  const ageMinutes = updatedAt ? (Date.now() - updatedAt.getTime()) / 60000 : null;

  return {
    deviceName: device.name || "Solar",
    subscriptionUntil: device.subscription_until || null,
    inverterOk: row.inverter_ok !== false,
    updatedAt: updatedAt ? updatedAt.toISOString() : null,
    ageMinutes,
    stale: ageMinutes != null && ageMinutes > CONFIG.staleAfterMinutes,

    pv: num(l.pv_total),
    pv1: num(l.pv1_power),
    pv2: num(l.pv2_power),
    load: num(l.load_power),
    battSoc: num(l.battery_soc),
    battPower: num(l.battery_power),
    battEta: l.battery_eta == null ? null : String(l.battery_eta),
    // Inferred from live data: at night with no PV and no battery flow, grid
    // power tracked house load almost exactly, so positive means import.
    grid: num(l.grid_power),
    gridPresent: l.grid_present == null ? null : l.grid_present === true || l.grid_present === "true",
    gridVoltage: num(l.grid_voltage),
    invTemp: num(l.inverter_temp),

    dailyPv: num(l.daily_pv_gen),
    dailyLoad: num(l.daily_load),
    dailyImport: num(l.daily_grid_import),
    dailyExport: num(l.daily_grid_export),
    dailySelfBurn: num(l.daily_self_burn),
  };
}

// ============================================================================
// HISTORY — today's 5-minute series, for the chart.
// ============================================================================

/** Local midnight today. `snapshots_5min.ts` is epoch SECONDS, not millis. */
function startOfTodaySeconds() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

/**
 * Average into at most `target` buckets. A full day is 288 rows against a
 * chart a couple of hundred points wide, so plotting every row would alias —
 * and averaging rather than sampling keeps the shape of the curve instead of
 * letting whichever row happened to be picked stand in for five minutes.
 */
function downsample(points, target) {
  if (points.length <= target) return points;
  const out = [];
  for (let i = 0; i < target; i++) {
    const from = Math.floor((i * points.length) / target);
    const to = Math.max(Math.floor(((i + 1) * points.length) / target), from + 1);
    const bucket = points.slice(from, to);
    const mean = (key) => {
      const vals = bucket.map((p) => p[key]).filter((v) => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    out.push({ ts: bucket[bucket.length - 1].ts, pv: mean("pv"), load: mean("load") });
  }
  return out;
}

async function loadSeries(deviceId, token, log) {
  const res = await rest(
    `snapshots_5min?device_id=eq.${deviceId}&ts=gte.${startOfTodaySeconds()}` +
      `&select=ts,pv_total,load_power&order=ts.asc`,
    token
  );
  log(`snapshots -> HTTP ${res.status}, ${Array.isArray(res.json) ? res.json.length : "?"} row(s)`);
  if (res.status !== 200 || !Array.isArray(res.json)) return null;

  const points = res.json
    .map((row) => ({ ts: num(row.ts), pv: num(row.pv_total), load: num(row.load_power) }))
    .filter((p) => p.ts != null);
  return downsample(points, 72);
}

// ============================================================================
// CACHE — the widget shows the last good reading when offline.
// ============================================================================

function cachePath() {
  const fm = FileManager.local();
  return fm.joinPath(fm.documentsDirectory(), CACHE_FILE);
}

function saveCache(reading) {
  try {
    FileManager.local().writeString(cachePath(), JSON.stringify({ savedAt: new Date().toISOString(), reading }));
  } catch (e) { /* best effort */ }
}

function loadCache() {
  try {
    const fm = FileManager.local();
    if (!fm.fileExists(cachePath())) return null;
    const parsed = JSON.parse(fm.readString(cachePath()));
    return parsed && parsed.reading ? parsed.reading : null;
  } catch (e) {
    return null;
  }
}

// ============================================================================
// RENDERING
// ============================================================================

function styled(container, text, { size, color, bold = false, opacity = 1, lines = 1 }) {
  const t = container.addText(text);
  t.font = bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  t.textColor = color;
  t.textOpacity = opacity;
  t.lineLimit = lines;
  t.minimumScaleFactor = 0.6;
  return t;
}

function background(widget) {
  const g = new LinearGradient();
  g.colors = [THEME.bgTop, THEME.bgBottom];
  g.locations = [0, 1];
  widget.backgroundGradient = g;
}

/** A small labelled figure, used in the metric grids. */
function metric(container, label, value, color) {
  const cell = container.addStack();
  cell.layoutVertically();
  styled(cell, label, { size: 9, color: THEME.dim, bold: true });
  styled(cell, value, { size: 15, color: color || THEME.text, bold: true });
  return cell;
}

/**
 * Today's curve, rasterised by DrawContext. Solar is the filled hero series
 * and load rides over it as a bare line, both on one shared watts axis based
 * at zero — they are the same unit, and a second scale would invent crossings
 * that aren't in the data.
 *
 * Returns null when there is too little of the day to draw, so callers fall
 * back to the plain layout instead of showing a near-empty box.
 */
function drawChart(series, width, height, withLoad) {
  const points = (series || []).filter((p) => p && p.ts != null && (p.pv != null || p.load != null));
  if (points.length < 3) return null;

  let peak = 0;
  for (const p of points) {
    if (p.pv != null) peak = Math.max(peak, p.pv);
    if (withLoad && p.load != null) peak = Math.max(peak, p.load);
  }
  if (peak <= 0) return null; // a flat-zero night has no curve worth the space

  const dark = darkAppearance();
  const solarHex = seriesHex("solar", dark);
  const loadHex = seriesHex("load", dark);

  const ctx = new DrawContext();
  ctx.size = new Size(width, height);
  ctx.opaque = false;
  ctx.respectScreenScale = true;

  const inset = 2; // keeps a 2pt stroke from clipping against the edges
  const base = height - inset;
  const plotH = base - inset;

  // x by timestamp rather than row index: an hour of missed reporting should
  // stretch across an hour of the chart, not compress into what looks like a
  // normal five-minute step.
  const first = points[0].ts;
  const span = Math.max(points[points.length - 1].ts - first, 1);
  const x = (p) => inset + ((p.ts - first) / span) * (width - inset * 2);
  const y = (w) => base - (Math.max(w, 0) / peak) * plotH;

  const trace = (key) => {
    const path = new Path();
    let started = false;
    for (const p of points) {
      if (p[key] == null) continue;
      const pt = new Point(x(p), y(p[key]));
      if (started) path.addLine(pt);
      else {
        path.move(pt);
        started = true;
      }
    }
    return started ? path : null;
  };

  // Area first, so the load line stays legible where the two overlap.
  const filled = points.filter((p) => p.pv != null);
  if (filled.length >= 2) {
    const area = new Path();
    area.move(new Point(x(filled[0]), base));
    for (const p of filled) area.addLine(new Point(x(p), y(p.pv)));
    area.addLine(new Point(x(filled[filled.length - 1]), base));
    area.closeSubpath();
    ctx.setFillColor(new Color(solarHex, 0.22));
    ctx.addPath(area);
    ctx.fillPath();
  }

  for (const [key, hex] of [["pv", solarHex], ["load", withLoad ? loadHex : null]]) {
    if (!hex) continue;
    const path = trace(key);
    if (!path) continue;
    ctx.setStrokeColor(new Color(hex));
    ctx.setLineWidth(2);
    ctx.addPath(path);
    ctx.strokePath();
  }

  return { image: ctx.getImage(), peak, dark };
}

/**
 * Two series means identity must not rest on colour alone, so a load line
 * always ships a labelled key. The dots take the same resolved hex as the
 * plotted marks, so the key can't drift from the chart across an appearance
 * change.
 */
function chartKey(container, chart, withLoad, trailing) {
  const row = container.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();

  const entry = (hex, label) => {
    const dot = row.addStack();
    dot.size = new Size(6, 6);
    dot.cornerRadius = 3;
    dot.backgroundColor = new Color(hex);
    row.addSpacer(4);
    styled(row, label, { size: 9, color: THEME.dim, bold: true });
  };

  entry(seriesHex("solar", chart.dark), "Solar");
  if (withLoad) {
    row.addSpacer(10);
    entry(seriesHex("load", chart.dark), "Load");
  }
  row.addSpacer();
  if (trailing) styled(row, trailing, { size: 9, color: THEME.dim });
  return row;
}

/**
 * Widget point sizes differ by handset — a medium is 291pt wide on an SE and
 * 364pt on a Pro Max — and Scriptable can't report the box it was handed. So
 * the chart is drawn once at the widest case and dropped into a height-capped
 * stack to be scaled down to fit: a fixed width would either overflow the
 * small phones or strand 80pt of dead space on the large ones.
 */
function placeChart(container, chart, height) {
  const frame = container.addStack();
  frame.size = new Size(0, height); // 0 = take the width you're given
  const img = frame.addImage(chart.image);
  img.resizable = true;
  img.applyFittingContentMode();
  return img;
}

/** Grid status is the headline during an outage, so it gets its own colour. */
function gridSummary(r) {
  if (r.gridPresent === false) return { text: "GRID OUT", color: THEME.bad };
  if (r.grid == null) return { text: "—", color: THEME.text };
  if (r.grid > 0) return { text: `${formatPower(r.grid)} in`, color: THEME.warn };
  if (r.grid < 0) return { text: `${formatPower(-r.grid)} out`, color: THEME.good };
  return { text: "idle", color: THEME.dim };
}

function headerLine(r) {
  if (!r.inverterOk) return { text: `${r.deviceName} · inverter fault`, color: THEME.bad };
  if (r.stale) return { text: `${r.deviceName} · ${formatAge(r.ageMinutes)}`, color: THEME.warn };
  return { text: r.deviceName, color: THEME.dim };
}

function renderSmall(widget, r) {
  const h = headerLine(r);
  styled(widget, h.text, { size: 10, color: h.color, bold: true });
  widget.addSpacer(4);

  styled(widget, "SOLAR NOW", { size: 9, color: THEME.dim, bold: true });
  styled(widget, formatPower(r.pv), { size: 26, color: THEME.sun, bold: true });

  widget.addSpacer(2);
  const row = widget.addStack();
  row.layoutHorizontally();
  styled(row, `Today ${formatEnergy(r.dailyPv)}`, { size: 11, color: THEME.text });

  // Solar alone here — at this size a second line is a smudge, and one series
  // needs no key because "SOLAR NOW" above it already says what it is.
  const chart = drawChart(r.series, 142, 22, false);
  if (chart) {
    widget.addSpacer(4);
    placeChart(widget, chart, 22);
  }

  widget.addSpacer();
  const bottom = widget.addStack();
  bottom.layoutHorizontally();
  styled(bottom, `Batt ${formatPercent(r.battSoc)}`, { size: 11, color: THEME.dim, bold: true });
  bottom.addSpacer();
  const g = gridSummary(r);
  styled(bottom, g.text, { size: 11, color: g.color, bold: true });
}

function renderMedium(widget, r) {
  const h = headerLine(r);
  const top = widget.addStack();
  top.layoutHorizontally();
  styled(top, h.text, { size: 10, color: h.color, bold: true });
  top.addSpacer();
  styled(top, `Today ${formatEnergy(r.dailyPv)}`, { size: 10, color: THEME.sun, bold: true });

  widget.addSpacer(6);

  const body = widget.addStack();
  body.layoutHorizontally();

  // Left: the headline figure.
  const left = body.addStack();
  left.layoutVertically();
  left.size = new Size(110, 0);
  styled(left, "SOLAR NOW", { size: 9, color: THEME.dim, bold: true });
  styled(left, formatPower(r.pv), { size: 22, color: THEME.sun, bold: true });
  if (r.load != null) styled(left, `Load ${formatPower(r.load)}`, { size: 11, color: THEME.dim });

  body.addSpacer();

  // Right: the rest of the flows.
  const right = body.addStack();
  right.layoutVertically();
  const g = gridSummary(r);
  metric(right, "BATTERY", `${formatPercent(r.battSoc)}${r.battPower ? `  ${formatPower(r.battPower)}` : ""}`);
  right.addSpacer(6);
  metric(right, "GRID", g.text, g.color);

  const updated = r.updatedAt ? `Updated ${formatAge(r.ageMinutes)}` : "";
  const chart = drawChart(r.series, 336, 30, true);
  if (chart) {
    widget.addSpacer(4);
    placeChart(widget, chart, 30);
    // The key's trailing slot carries the freshness line, which would
    // otherwise need a row of its own that this size can't spare.
    chartKey(widget, chart, true, updated);
    return;
  }

  widget.addSpacer();
  styled(widget, updated, { size: 9, color: THEME.dim });
}

function renderLarge(widget, r) {
  const h = headerLine(r);
  const top = widget.addStack();
  top.layoutHorizontally();
  top.centerAlignContent();
  styled(top, r.deviceName, { size: 15, color: THEME.text, bold: true });
  top.addSpacer();
  styled(top, h.text === r.deviceName ? "live" : h.text, { size: 10, color: h.color, bold: true });

  widget.addSpacer(10);

  // Headline: generation now and today's total side by side.
  const hero = widget.addStack();
  hero.layoutHorizontally();
  hero.bottomAlignContent();
  const heroLeft = hero.addStack();
  heroLeft.layoutVertically();
  styled(heroLeft, "SOLAR NOW", { size: 9, color: THEME.dim, bold: true });
  styled(heroLeft, formatPower(r.pv), { size: 34, color: THEME.sun, bold: true });
  hero.addSpacer();
  const heroRight = hero.addStack();
  heroRight.layoutVertically();
  styled(heroRight, "GENERATED TODAY", { size: 9, color: THEME.dim, bold: true });
  styled(heroRight, formatEnergy(r.dailyPv), { size: 22, color: THEME.text, bold: true });

  // The day's shape, directly under the day's headline figures.
  const chart = drawChart(r.series, 336, 76, true);
  if (chart) {
    widget.addSpacer(8);
    placeChart(widget, chart, 76);
    chartKey(widget, chart, true, `Peak ${formatPower(chart.peak)}`);
  }

  widget.addSpacer(12);
  const rule = widget.addStack();
  rule.size = new Size(0, 1);
  rule.backgroundColor = THEME.rule;
  widget.addSpacer(10);

  // Flows now.
  const flows = widget.addStack();
  flows.layoutHorizontally();
  const g = gridSummary(r);
  metric(flows, "LOAD", formatPower(r.load));
  flows.addSpacer();
  metric(flows, "BATTERY", formatPercent(r.battSoc));
  flows.addSpacer();
  metric(flows, "BATT FLOW", formatPower(r.battPower));
  flows.addSpacer();
  metric(flows, "GRID", g.text, g.color);

  widget.addSpacer(12);

  // Today's energy ledger.
  const totals = widget.addStack();
  totals.layoutHorizontally();
  metric(totals, "USED", formatEnergy(r.dailyLoad));
  totals.addSpacer();
  metric(totals, "IMPORTED", formatEnergy(r.dailyImport));
  totals.addSpacer();
  metric(totals, "EXPORTED", formatEnergy(r.dailyExport));
  totals.addSpacer();
  metric(totals, "SELF-USED", formatEnergy(r.dailySelfBurn));

  widget.addSpacer();

  const foot = widget.addStack();
  foot.layoutHorizontally();
  const bits = [];
  if (r.updatedAt) bits.push(`Updated ${formatAge(r.ageMinutes)}`);
  if (r.invTemp != null) bits.push(`Inverter ${r.invTemp.toFixed(1)}°C`);
  if (r.battEta) bits.push(`Battery ${r.battEta}`);
  styled(foot, bits.join("  ·  "), { size: 9, color: THEME.dim });
}

function buildWidget(reading, stale) {
  const widget = new ListWidget();
  widget.setPadding(14, 14, 14, 14);
  background(widget);

  const family = config.widgetFamily || "medium";
  const r = Object.assign({}, reading);
  if (stale) r.stale = true;

  if (family === "small") renderSmall(widget, r);
  else if (family === "large" || family === "extraLarge") renderLarge(widget, r);
  else renderMedium(widget, r);

  widget.refreshAfterDate = new Date(Date.now() + CONFIG.refreshMinutes * 60 * 1000);
  return widget;
}

function buildErrorWidget(message) {
  const widget = new ListWidget();
  widget.setPadding(14, 14, 14, 14);
  background(widget);

  styled(widget, "SOLAR MONITOR", { size: 10, color: THEME.dim, bold: true });
  widget.addSpacer(6);
  styled(widget, message, { size: 12, color: THEME.text, lines: 5 });
  widget.addSpacer(4);
  styled(widget, "Open the script in Scriptable", { size: 9, color: THEME.dim });

  widget.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  return widget;
}

// ============================================================================
// IN-APP MENU — sign in, change account, test, sign out.
// ============================================================================

async function promptCredentials() {
  const alert = new Alert();
  alert.title = "Sign in";
  alert.message =
    "Your Solar Monitor login. Stored only in this phone's Keychain — never in the script file.";
  alert.addTextField("email", kcGet(KEY.email) || "");
  alert.addSecureTextField("password", "");
  alert.addAction("Save");
  alert.addCancelAction("Cancel");

  const choice = await alert.present();
  if (choice === -1) return null;

  const email = (alert.textFieldValue(0) || "").trim();
  const password = alert.textFieldValue(1) || "";
  if (!email || !password) {
    const warn = new Alert();
    warn.title = "Both fields are needed";
    warn.addAction("OK");
    await warn.present();
    return null;
  }
  return { email, password };
}

async function doSignIn() {
  const creds = await promptCredentials();
  if (!creds) return;

  const trace = [];
  const log = (l) => trace.push(l);

  // Verify before storing, so a typo doesn't get saved as your login.
  clearSession();
  const res = await signInWithPassword(creds.email, creds.password, log);

  const alert = new Alert();
  if (!res.ok) {
    alert.title = "Sign-in failed";
    alert.message = `${res.error}\n\nNothing was saved. Check the email and password and try again.`;
    alert.addAction("OK");
    await alert.present();
    return;
  }

  kcSet(KEY.email, creds.email);
  kcSet(KEY.password, creds.password);

  const result = await loadReading(log);
  if (result.error) {
    alert.title = "Signed in, but no data";
    alert.message = `${result.error}\n\nYour login was saved.`;
    alert.addAction("OK");
    await alert.present();
    return;
  }

  saveCache(result.reading);
  alert.title = "Signed in ✓";
  alert.message = `${result.reading.deviceName}\nSolar now ${formatPower(result.reading.pv)}, battery ${formatPercent(
    result.reading.battSoc
  )}, ${formatEnergy(result.reading.dailyPv)} today.\n\nAdd the widget to your home screen.`;
  alert.addAction("OK");
  await alert.present();
  await buildWidget(result.reading, false).presentMedium();
}

async function doTest() {
  const trace = [];
  const result = await loadReading((l) => trace.push(l));

  if (result.error) {
    const report = [
      "=== Solar widget diagnostic ===",
      `when: ${new Date().toISOString()}`,
      `signed in: ${hasCredentials() ? "yes" : "no"}`,
      "",
      "--- trace ---",
      ...trace,
      "",
      `RESULT: ${result.error}`,
    ].join("\n");
    console.log(report);
    Pasteboard.copy(report);

    const alert = new Alert();
    alert.title = "No data";
    alert.message = `${result.error}\n\nA diagnostic report was copied to your clipboard.`;
    alert.addAction("OK");
    await alert.present();
    return;
  }

  saveCache(result.reading);
  await buildWidget(result.reading, false).presentLarge();
}

async function runMenu() {
  const alert = new Alert();
  alert.title = "Solar Monitor";
  alert.message = hasCredentials()
    ? `Signed in as ${kcGet(KEY.email) || "(unknown)"}.`
    : "Not signed in yet.";
  alert.addAction(hasCredentials() ? "Test now" : "Sign in");
  alert.addAction(hasCredentials() ? "Change account" : "Test now");
  if (hasCredentials()) alert.addDestructiveAction("Sign out");
  alert.addCancelAction("Close");

  const choice = await alert.present();
  const signedIn = hasCredentials();

  if (choice === 0) return signedIn ? doTest() : doSignIn();
  if (choice === 1) return signedIn ? doSignIn() : doTest();
  if (choice === 2 && signedIn) {
    signOut();
    const done = new Alert();
    done.title = "Signed out";
    done.message = "Your login was removed from this phone's Keychain.";
    done.addAction("OK");
    await done.present();
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  if (!config.runsInWidget) {
    await runMenu();
    Script.complete();
    return;
  }

  if (!hasCredentials()) {
    Script.setWidget(buildErrorWidget("Not signed in. Open this script in Scriptable to add your login."));
    Script.complete();
    return;
  }

  let result;
  try {
    result = await loadReading(() => {});
  } catch (e) {
    result = { error: `Network error: ${e.message}` };
  }

  let widget;
  if (result.reading) {
    saveCache(result.reading);
    widget = buildWidget(result.reading, false);
  } else {
    const cached = loadCache();
    widget = cached ? buildWidget(cached, true) : buildErrorWidget(result.error || "No data.");
  }

  Script.setWidget(widget);
  Script.complete();
}

await main();
