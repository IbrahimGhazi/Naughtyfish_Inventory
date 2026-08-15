# Masjid Prayer Times — iPhone widget

An iOS home screen widget for
[masajid.masjidinformationsystem.com](https://masajid.masjidinformationsystem.com)
showing the next prayer with a live countdown, all five daily prayer times,
the Hijri date and the masjid name.

It runs in [Scriptable](https://apps.apple.com/app/scriptable/id1405459188)
(free), so it needs **no Mac, no Xcode and no Apple Developer account**.

> **Note on where this lives.** This widget targets a different app than the
> rest of this repository. It sits in its own `ios-widget/` folder, shares no
> code with the Next.js app, and is not part of the build — the session that
> produced it was pinned to this repo's branch. It can be lifted into its own
> repo at any time by copying this folder.

---

## Install (about 3 minutes)

1. Install **Scriptable** from the App Store.
2. Open Scriptable, tap **+** (top right) to create a new script.
3. Paste in the entire contents of [`masjid-widget.js`](./masjid-widget.js).
4. Tap the script's settings (⚙ or the name at the top) and rename it
   **Masjid Prayer Times**.
5. **Run it once inside Scriptable** (the ▶ button). This is the diagnostic
   pass — see below. You should get a "Times found ✓" alert and a preview.
6. Go to your home screen, long-press an empty area → **+** → search
   **Scriptable** → pick a size (Small, Medium or Large) → **Add Widget**.
7. Long-press the new widget → **Edit Widget** → set **Script** to
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
| `pagePath` | `""` | Page to read, e.g. `/masjid/al-noor` if there's a page per masjid |
| `apiUrl` | `""` | If you know the JSON endpoint, set it — discovery is skipped entirely and the widget gets faster and more reliable |
| `countdownTo` | `"jamaat"` | Count down to the congregation time when available; `"start"` counts down to the adhan |
| `use24Hour` | `false` | 24-hour clock |
| `refreshMinutes` | `15` | Refresh cadence hint |
| `timeout` | `12` | Per-request timeout, seconds |
| `tapUrl` | `""` | Where tapping goes; defaults to the page being read |

### Several masjids, several widgets

You don't need to duplicate the script. Add a second Scriptable widget, point
it at the same script, and put the masjid's path (e.g. `/masjid/al-noor`) or a
full URL in the widget's **Parameter** field. That overrides `pagePath` for
that widget only.

---

## How the data is found

Strategies are tried in order and the first that yields at least three
recognisable prayers wins:

1. **`CONFIG.apiUrl`** — an endpoint you supplied.
2. **`__NEXT_DATA__`** — the SSR payload of a Next.js pages-router site.
3. **`self.__next_f`** — the streaming RSC payload of a Next.js app-router site.
4. **Any inline JSON** mentioning a prayer name — Nuxt, Redux preloaded state,
   JSON-LD and similar. Balanced-brace scanning pulls the object out of the
   surrounding script text.
5. **Rendered HTML text** — reads `Fajr … 5:12 am … 5:30 am` straight out of
   the markup. Brittle by nature; it's the last resort before probing.
6. **Common `/api/*` endpoints** — for a fully client-rendered app that ships
   no data in its HTML.

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
