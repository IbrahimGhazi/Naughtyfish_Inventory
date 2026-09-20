# Solar Monitor — iPhone widget

An iOS home screen widget for the Emergy solar monitor
([solar-monitor-rose.vercel.app](https://solar-monitor-rose.vercel.app/)):
generation now, house load, battery state of charge, grid import/export,
grid-outage status and today's kWh.

Runs in [Scriptable](https://apps.apple.com/app/scriptable/id1405459188)
(free) — **no Mac, no Xcode, no Apple Developer account**.

> **Note on where this lives.** This widget targets a different app than the
> rest of this repository. It is self-contained in `ios-widget-solar/`, shares
> no code with the Next.js app, is not part of the build, and is excluded from
> lint. Copy the folder into its own repo whenever convenient.

---

## Your login is never in this repository

The script contains **no credentials**. Your email and password are entered on
your phone and stored in the **iOS Keychain**, which is why this file is safe
in a public repo.

The two values that *are* in the script — the Supabase project URL and the
`anon` key — are public by design. The web app ships that same key to every
browser that loads it, and it grants nothing on its own: every table is behind
row-level security keyed to the signed-in user. Without a valid login it reads
nothing.

After the first sign-in the widget keeps a **refresh token** and uses that to
renew its session, so your password is not sent on a routine refresh.

---

## Install

1. Install **Scriptable** from the App Store.
2. Open Scriptable, tap **+**, and paste in this installer (safer than copying
   ~700 lines by hand on a phone):

   ```js
   const SRC = "https://raw.githubusercontent.com/IbrahimGhazi/Naughtyfish_Inventory/90d3326/ios-widget-solar/solar-widget.js";
   const NAME = "Solar Monitor";

   let fm;
   try { fm = FileManager.iCloud(); fm.documentsDirectory(); } catch (e) { fm = FileManager.local(); }

   const code = await new Request(SRC).loadString();
   fm.writeString(fm.joinPath(fm.documentsDirectory(), `${NAME}.js`), code);

   const a = new Alert();
   a.title = "Installed ✓";
   a.message = `Saved "${NAME}" (${code.length} bytes).`;
   a.addAction("OK");
   await a.present();
   ```

3. Tap **▶**, then go back and open the new **Solar Monitor** script.

   **If the byte count looks stale**, you've hit GitHub's raw CDN cache: it
   caches branch paths for a few minutes, and a `?t=…` query string does *not*
   bust it. Swap the branch name in `SRC` for a commit SHA — those are
   immutable and always fresh:

   ```
   .../Naughtyfish_Inventory/<commit-sha>/ios-widget-solar/solar-widget.js
   ```

4. Tap **▶** on it. You'll get a menu — choose **Sign in** and enter your
   Solar Monitor email and password. It verifies the login *before* saving, so
   a typo never gets stored.
5. On success you'll see a preview with your live figures.
6. Home screen → long-press → **+** → **Scriptable** → pick a size →
   **Add Widget**, then long-press the widget → **Edit Widget** → **Script** =
   *Solar Monitor*.

## Changing the login later

Run the script inside Scriptable. The menu offers:

| Action | What it does |
|---|---|
| **Test now** | Fetches live data and shows a preview |
| **Change account** | Re-enter email and password — use this to switch from the test account to your own |
| **Sign out** | Wipes email, password and tokens from the Keychain |

---

## Widget sizes

| Size | Shows |
|---|---|
| **Small** | Generation now, today's kWh, battery %, grid state |
| **Medium** | Generation now + load on the left; battery and grid on the right; today's kWh |
| **Large** | Generation now and today's total, then load / battery / battery flow / grid, then the day's ledger (used, imported, exported, self-used), plus inverter temperature and battery ETA |

Grid state reads **`1.37 kW in`** when importing, **`1.50 kW out`** when
exporting, and a red **`GRID OUT`** when the grid is down — which on a solar
system is usually the thing you actually want to know at a glance.

---

## Configuration

At the top of the script:

| Option | Default | What it does |
|---|---|---|
| `device` | `""` | Which inverter, matched on device name (e.g. `Emergy`). Empty uses the first one your account can see. A widget's **Parameter** field overrides it, so two widgets can show two inverters |
| `staleAfterMinutes` | `20` | Readings older than this are labelled with their age |
| `refreshMinutes` | `5` | Refresh hint. The inverter reports every 5 minutes, so asking more often gains nothing |
| `timeout` | `20` | Per-request timeout, seconds |

---

## When it can't show data, it says why

Rather than a blank square, each failure names its cause:

| Message | Meaning |
|---|---|
| `Not signed in…` | No credentials in the Keychain yet |
| `Session rejected…` | The server refused the token (HTTP 401); tokens were cleared, sign in again |
| `Can't reach the server (HTTP …)` | Transport or server failure — **not** an account problem |
| `No solar device is linked to this account.` | Login worked, but no inverter membership |
| `Subscription expired <date> — renew to see live data.` | See below |
| `No device matching "x". Available: …` | The `device` setting doesn't match |
| `· offline` / `<age> ago` | Showing the last cached reading, or a stale one |

### Two server-side gates worth knowing about

Both live in the database's row-level security, so they affect the widget
exactly as they affect the web app:

- **Subscription.** `device_status` is readable only while
  `devices.subscription_until` is in the future. At the time of writing yours
  runs to **2026-09-27** — after that the API returns no rows and the widget
  will show the "Subscription expired" message.
- **MFA.** A policy requires `aal2` *if* the account has a verified MFA factor.
  None are enrolled today, so email + password is enough. If you later turn on
  MFA, a password-only login drops to `aal1` and reads nothing — the widget
  would need an MFA step at that point.

---

## Behaviour

- **Offline**: the last good reading is cached to disk and shown marked stale.
- **Token handling**: a live access token is reused; otherwise the refresh
  token renews the session; the stored password is only used if that fails.
- **Units**: power in W/kW, daily energy in kWh, battery in %, temperature °C —
  matching what the inverter reports.
- **Grid sign convention**: positive `grid_power` is treated as import. That's
  inferred from live data — at night with no PV and no battery flow, grid power
  tracked house load almost exactly.

## Limitations

- Scriptable must stay installed; this can't ship on the App Store.
- Read-only. It shows the system; it can't control it.
- No history or charts — it reads the current snapshot, not the 5-minute
  series, though `snapshots_5min` is available if a sparkline is wanted later.
