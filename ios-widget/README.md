# Masjid Prayer Times — iPhone widget

An iOS home screen widget for
[masajid.masjidinformationsystem.com](https://masajid.masjidinformationsystem.com)
showing the next prayer with a live countdown, all five daily prayer times,
the Hijri date and the masjid name.

It runs in [Scriptable](https://apps.apple.com/app/scriptable/id1405459188)
(free), so it needs **no Mac, no Xcode and no Apple Developer account**.

**Status: confirmed working against the live site**, with the next-prayer
countdown agreeing with the wall clock. Ships configured for
**Mudassir Masjid**; change `CONFIG.masjid` for a different one.

> **Note on where this lives.** This widget targets a different app than the
> rest of this repository. It sits in its own `ios-widget/` folder, shares no
> code with the Next.js app, and is not part of the build — the session that
> produced it was pinned to this repo's branch. It can be lifted into its own
> repo at any time by copying this folder.

---

## Install (about 3 minutes)

1. Install **Scriptable** from the App Store.
2. Open Scriptable, tap **+** (top right) to create a new script, and paste in
   this installer — copying 1,200 lines by hand on a phone is how you end up
   with a truncated file and a `SyntaxError`:

   ```js
   const SRC = "https://raw.githubusercontent.com/IbrahimGhazi/Naughtyfish_Inventory/claude/iphone-widget-masjid-bzhhqt/ios-widget/masjid-widget.js";
   const NAME = "Masjid Prayer Times";

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

3. Tap **▶**. It downloads the widget and saves it as *Masjid Prayer Times*.
   Re-run this any time to pull the latest version.
4. Back in the script list, open **Masjid Prayer Times** and tap **▶**. This is
   the diagnostic pass — see below. You should get a "Times found ✓" alert and
   a preview.
5. Go to your home screen, long-press an empty area → **+** → search
   **Scriptable** → pick a size (Small, Medium or Large) → **Add Widget**.
6. Long-press the new widget → **Edit Widget** → set **Script** to
   *Masjid Prayer Times*.

Done. Tapping the widget opens the site.

---

## First run: the diagnostic pass

The widget has to read prayer times off a site whose data format wasn't known
when it was written, so it tries several strategies (see
*How the data is found*). Running the script **inside Scriptable** rather than
as a widget puts it in diagnostic mode:

- it reports which strategy matched and what it parsed,
- it prints the five times it resolved so you can check them against the site,
- it copies the whole report to your clipboard.

**If it says "No times found":** the report on your clipboard contains the
first 2500 characters of what the site actually returned. Paste that back and
the parser can be pointed straight at the real data — that's the fastest way
to finish the job.

---

## Widget sizes

| Size | Shows |
|---|---|
| **Small** | Masjid name, next prayer, countdown, its time, Hijri date |
| **Medium** | Next prayer + countdown on the left, all five times on the right (captioned `JAMAAT` or `BEGINS` so it's unambiguous), Hijri date |
| **Large** | Header with Hijri date, a big next-prayer banner, then all five prayers with **both** the begins and jamaat columns |

Past the day's last prayer, the countdown rolls over to tomorrow's Fajr and is
labelled `tmrw` / `TOMORROW`.

---

## Configuration

Everything adjustable is in the `CONFIG` block at the top of the script.

| Option | Default | What it does |
|---|---|---|
| `siteUrl` | `https://masajid.masjidinformationsystem.com` | Base site, no trailing slash |
| `masjid` | `"mudassirmasjid"` | **Which masjid to show.** Accepts the username, the English name, or the masjid's page URL (`https://…/masjid/mudassirmasjid`) — the slug is pulled out of the URL for you. Matching ignores case, punctuation and doubled letters, so `"mudasir"` finds *Masjid-e-Mudassir*. An exact name wins over a partial one. Empty uses the first masjid the site lists |
| `pagePath` | `""` | Only used by the HTML strategies. Leave empty for this site |
| `apiUrl` | `""` | If you know the JSON endpoint, set it — discovery is skipped entirely and the widget gets faster and more reliable |
| `countdownTo` | `"jamaat"` | Count down to the congregation time when available; `"start"` counts down to the adhan |
| `use24Hour` | `false` | 24-hour clock |
| `refreshMinutes` | `15` | Refresh cadence hint |
| `timeout` | `12` | Per-request timeout, seconds |
| `tapUrl` | `""` | Where tapping goes. Empty means the selected masjid's own page (`/masjid/<username>`) |

### Several masjids, several widgets

You don't need to duplicate the script. Add a second Scriptable widget, point
it at the same script, and put the masjid's name or username (e.g. `Hamza`) in
the widget's **Parameter** field. That overrides `CONFIG.masjid` for that
widget only, so two widgets can show two different masajid from one script.

Run the script inside Scriptable to see the list of available masajid and
their usernames.

---

## How the data is found

Strategies are tried in order and the first that yields at least three
recognisable prayers wins:

1. **A known endpoint** — `CONFIG.apiUrl`, or one remembered from an earlier
   bundle scan (below). Either way this is a single request.
2. **`__NEXT_DATA__`** — the SSR payload of a Next.js pages-router site.
3. **`self.__next_f`** — the streaming RSC payload of a Next.js app-router site.
4. **Any inline JSON** mentioning a prayer name — Nuxt, Redux preloaded state,
   JSON-LD and similar. Balanced-brace scanning pulls the object out of the
   surrounding script text.
5. **Rendered HTML text** — reads `Fajr … 5:12 am … 5:30 am` straight out of
   the markup. Brittle by nature.
6. **The authenticated list-then-timings handshake** (below) — what the target
   site actually needs.
7. **Endpoints read out of the app's JS bundle** — for a client-rendered SPA.
8. **Common `/api/*` endpoint names** — a last-resort guess.

### The authenticated handshake (strategy 6)

The target site's timings endpoints exist but refuse anonymous callers:

```
GET /api/v1/timings/today   -> 400 {"error":"Authorization header is missing"}
GET /api/v1/masjid/all      -> 200 [{"engName":…,"username":"masjidehamza",…}]
```

The masjid list is public and carries a `username` per masjid, so the sequence
is: list the masajid → pick the one you want → call the timings endpoint
presenting that masjid's identifier as the `Authorization` header.

The exact header format isn't documented, so the widget tries the plausible
ones (`<id>`, `Bearer <id>`, across `username`/`id`/`slug`/…) and **remembers
whichever the server accepts**, alongside the endpoint. After the first
success it's one request per refresh with the known credential.

This is the path that works in practice — it's how the live widget resolves
its times.

### The bundle scan (strategy 7)

This is what found the endpoints in the first place. The target site is a
Create React App SPA: the HTML is a 1.4 KB shell containing nothing but
`<div id="root">`, so strategies 2–5 have nothing to read, and guessing
endpoint names is a lottery.

The app's own JS bundle, however, contains every path it calls. So the widget
fetches the bundle, extracts `/api/…` string literals (and any dedicated API
host), ranks them — endpoints mentioning *timing/prayer/jamaat* first, then
*masjid*, then *today/schedule* — and probes the plausible ones until one
returns something with prayer times in it.

**The winner is cached to disk**, so this cost is paid once. Later refreshes go
straight to the remembered endpoint: one request, no bundle download. Copying
that URL into `CONFIG.apiUrl` makes it permanent.

Recognition is deliberately tolerant: it accepts `fajr`/`fajar`/`subh`,
`dhuhr`/`zuhr`/`zohr`, nested `{start, jamaat}` objects, flat `fajrJamaat`
keys, 12- and 24-hour strings, and ISO timestamps.

**Setting `apiUrl` once you know it is worth doing** — it skips all of the
above and stops the widget breaking when the site's markup changes.

---

## Behaviour worth knowing

- **Offline**: the last successfully parsed schedule is cached to disk. If the
  network fails the widget shows those times and marks itself `· offline`.
- **Refresh timing**: iOS decides when widgets actually reload. The widget asks
  to be refreshed at whichever comes first — the normal cadence or the next
  prayer time — so the countdown doesn't sit visibly stale through a prayer.
- **Hijri date** is computed on-device via `Intl` with the Umm al-Qura
  calendar. No network needed, and it may differ by a day from your local
  moon-sighting convention.
- **Nothing parsed**: rather than showing a blank square, the widget says so
  and tells you to run the script for a diagnosis.

---

## Limitations

- Scriptable must stay installed; this can't be shipped on the App Store. If
  you want a real distributable widget, it needs a native WidgetKit extension
  in Swift, which requires a Mac, Xcode and a developer account.
- Jumu'ah is not shown (not requested). It's a small addition if wanted —
  the extraction layer already ignores any key it doesn't recognise.
- The HTML-text strategy breaks when the site's markup changes. Setting
  `apiUrl` avoids this entirely.
- Times are shown exactly as the site publishes them; no calculation,
  no timezone conversion, no madhab or angle settings.
