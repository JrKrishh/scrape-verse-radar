# Demo video script (~3 min)

## Act 1 — The problem (30s)

1. Screen: tnpsc.gov.in/English/Notification.aspx. Point out: no RSS icon, no API,
   plain ASP.NET, vendor updates change the layout regularly.
2. Voice: "TNPSC aspirants refresh this page daily. When the site redesigns, the
   scrapers people build quietly break. Sangah — my Play Store app with TNPSC
   prep users — has no reliable way to get these notifications."

## Act 2 — Build with the CLI (45s)

3. Terminal: `bdata scraper create https://tnpsc.gov.in/English/Notification.aspx "Extract each latest notification: title, date, document link"` — show the AI
   stages printing, Collector ID `c_...` returned.
4. `bdata scraper run <c_...> <url> --pretty` — clean JSON rows.
5. Show `data/latest.json` in the repo: the same output, committed.

## Act 3 — The pipeline (45s)

6. Show the GitHub Actions run (wall of green): cron triggers `scripts/pipeline.js`,
   which POSTs `/dca/trigger`, polls `/dca/dataset`, validates every field.
7. Show the Cloudflare dashboard: notifications timeline, health badge, heal log.

## Act 4 — The break + heal (60s)

8. Breakme demo: run the demo collector on v1 of our page — rows flow.
9. Swap in v2 (redesigned markup, same content). Re-run — extraction returns zero
   rows / empty fields. `HEAL_NEEDED`.
10. `bdata scraper heal <same c_...> "The page was redesigned: titles moved to
    [data-heading], dates to [data-date]. Re-capture all fields."` → preview shows
    recovered rows → `bdata scraper approve <same c_...>` → re-run.
11. Emphasize: **same Collector ID** — the cron, the worker, the dashboard never
    changed. Then show the automated version: GH Actions heal step running the same
    heal unattended.

## Act 5 — Impact + close (30s)

12. "The diff of new notifications feeds Sangah's news pipeline — real users on the
    Play Store see new exam announcements the day they're published, even when the
    site breaks under us."
13. Quick architecture diagram, credits, repo URL.

## Recording notes

- Record at 1080p, terminal zoomed, no secrets visible (mask token with env var echo).
- If TNPSC is slow/unavailable during recording, do Act 2/4 on the breakme page and
  show a pre-recorded TNPSC run from `data/snapshot-*.json`.
