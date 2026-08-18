# Submission package — Scrape-Verse Radar

Fill the submission form from this file. Placeholder values marked with `<>`.

## Project name

Scrape-Verse Radar — self-healing TN job notification watcher

## One-liner

A Bright Data Scraper Studio collector that watches FreeJobAlert's Tamil Nadu
page, detects when the site changes under it, heals itself in place, and feeds
the diff to a dashboard and a JSON feed for the Sangah exam-prep app.

## The problem

Tamil Nadu exam aspirants depend on one page: FreeJobAlert's TN government jobs
section (TNPSC Group posts, state vacancies, admit cards, results). The page has
no RSS feed and no API, and its layout changes whenever the site redesigns.
Scrapers people build against it break quietly — and aspirants miss application
windows. The primary source (tnpsc.gov.in) is on Bright Data's compliance-
restricted list, so the long-tail aggregator is where the data actually lives.

## The build

- Collector `c_msygw29h15ak5olz7j`, created with `bdata scraper create` from a
  one-sentence description, returns title, organization, vacancies, last date,
  article link. 93 unique items per run.
- Node pipeline (`scripts/pipeline.js`): `POST /dca/trigger` → poll
  `/dca/dataset` → normalize/dedupe → validate every field. Exits
  `HEAL_NEEDED` when extraction is empty or fields go missing.
- Self-heal engine (`scripts/heal.js`): drives the AI-Flow API directly
  (`refactor_template` → poll → `resume_automation_job` with
  `{"message": true, "auto_save": true}`), so fixes actually reach production.
  Discovered the hard way that the CLI's `approve` leaves the fix in draft.
- GitHub Actions cron (03:30 UTC): run → validate → heal if broken → re-run →
  commit `data/latest.json`. Wall of green checks.
- Cloudflare Worker (dashboard + cron at 04:00 UTC): same trigger/poll/normalize
  loop, diffs against KV, exposes `/api/notifications` (the feed Sangah's news
  worker can consume), `/api/events` (event/heal log), `/api/health`.

## Self-healing evidence

1. Heal gate on production: two attempted heals (populate `last_date_to_apply`
   from article pages) failed preview because article pages 404 under the
   crawler. Both rejected; production scraper untouched. The gate works.
2. Controlled break (fully rehearsed, video-ready): demo collector
   `c_msyjvrj260j7iso3o` targets a page we host. v1 markup → 3 clean rows. The
   "redesign" swaps in JS-rendered markup (one KV write) → `[]`, zero rows.
   One heal prompt → preview shows recovered rows → auto_save publishes → same
   Collector ID returns 3 rows. Nothing downstream changed.
3. Snapshots committed: `data/heal-demo-broken.json`, `data/heal-demo-healed.json`.

## Impact

The diff of new notifications is a stable JSON feed. It plugs into the same
Cloudflare stack as Sangah (TNPSC exam prep on the Play Store), whose users
currently rely on manual refreshes. Same Collector ID, zero downstream changes
when the site redesigns — the scraper self-heals and the feed keeps flowing.

## Links

- Repo: https://github.com/JrKrishh/scrape-verse-radar
- Dashboard: https://scrape-verse-radar.manir1179.workers.dev
- Demo video: <paste YouTube/unlisted link>
- CI runs: https://github.com/JrKrishh/scrape-verse-radar/actions

## How Scraper Studio was used (for the form)

- `bdata scraper create` — AI-generated the collector from a one-sentence
  description; all 9 generation stages ran in the terminal.
- `bdata scraper run` — production runs return clean JSON.
- `bdata scraper heal` — two heal attempts on the production collector, both
  reviewed at the approval gate and rejected (previews failed); one heal on the
  demo collector, approved with `auto_save` and verified by re-run.
- `POST /dca/trigger` + `GET /dca/dataset` — the Collector ID runs as a
  production API from Node (CI) and Cloudflare Workers, no deployment step.
- AI-Flow API (`refactor_template`, `resume_automation_job`) — unattended
  self-heal loop that publishes fixes to production.

## AI use disclosure

- Bright Data Scraper Studio AI Agent: scraper generation + self-heal fixes
  (every fix reviewed against previews before approve/reject).
- Claude Code: pipeline, heal engine, worker, dashboard, CI workflow. All
  generated code reviewed and verified by running it.

## Rules checklist

- Custom Scraper Studio collector: yes (`c_msygw29h15ak5olz7j`)
- Public data only: yes (public job-notification listing, no login walls)
- Repo + README + example output: yes (`data/latest.json`, heal snapshots)
- Demo video: <link>
- Coding began after Aug 17: yes
