# Scrape-Verse Radar — self-healing TN job notification watcher

Submission for **Into the Scrape-Verse** (WeMakeDevs × Bright Data, Aug 17–23 2026).

TN government exam aspirants live on one page: FreeJobAlert's Tamil Nadu section.
TNPSC Group posts, state vacancies, admit cards, results — it has no RSS feed, no
API, and its layout changes whenever the site redesigns. Scrapers people build
against it break quietly. This project builds one on Bright Data Scraper Studio
that detects when the site changes under it, heals itself in place, and feeds the
diff into a dashboard and a JSON feed — the same Cloudflare stack that powers
Sangah, a TN exam prep app on the Play Store.

## Why not scrape the source?

The primary source (`tnpsc.gov.in`) is on Bright Data's compliance-restricted
domain list (`brul` / "Domain not allowed"), so the collector targets
FreeJobAlert — where aspirants actually read the notifications — which is a
long-tail site with no pre-built scraper in Bright Data's library.

## Architecture

```
Cloudflare Worker cron (daily)            GitHub Actions (daily cron)
        │                                          │
        ▼                                          ▼
scheduled handler ──POST /dca/trigger──►  scripts/pipeline.js ──trigger──►
        │                                          │
        ▼  poll /dca/dataset                       ▼  poll /dca/dataset
normalize + diff vs KV                       normalize + validate
        │                                          │
        ▼  broken?                                 ▼  empty/missing fields?
mark heal_needed                            bdata scraper heal --auto-approve
        │                                          │
        ▼                                          ▼  re-run, commit data/latest.json
/api/notifications, /api/events, dashboard
```

One scraper (`c_msygw29h15ak5olz7j`), two consumers, zero downstream changes when
the site redesigns: `bdata scraper heal` keeps the same Collector ID, so nothing
that references it breaks.

## Prerequisites

1. Bright Data account (free tier) — copy the API token from Account Settings.
2. The scraper used here was created with Scraper Studio:

```sh
npx -p @brightdata/cli bdata login
npx -p @brightdata/cli bdata scraper create https://www.freejobalert.com/tn-government-jobs/ \
  "Extract each job notification listed on the page: job title, organization name, number of vacancies, last date to apply, and the article link"
```

3. Configure the environment:

```sh
cp .env.example .env   # fill in BRIGHT_DATA_API_TOKEN
```

## Running

```sh
node --env-file=.env scripts/pipeline.js
```

The script triggers the collector over `POST /dca/trigger`, polls
`GET /dca/dataset`, normalizes the nested output (one item per unique
`article_link`), validates every field, and writes `data/latest.json`. It exits
non-zero with `HEAL_NEEDED` when extraction comes back empty or fields go missing.

Self-heal when the site changes:

```sh
npx -p @brightdata/cli bdata scraper heal c_msygw29h15ak5olz7j \
  "<what broke, in plain language>" --url https://www.freejobalert.com/tn-government-jobs/
npx -p @brightdata/cli bdata scraper approve c_msygw29h15ak5olz7j \
  --url https://www.freejobalert.com/tn-government-jobs/
node --env-file=.env scripts/pipeline.js   # same Collector ID, data flowing again
```

## Heal gate in action (real events from this build)

Two `heal` runs were attempted against the production collector to populate
`last_date_to_apply` from article pages. Both proposed diffs failed preview
(article pages 404 under the crawler), so both were rejected. The scraper stayed
on its known-good version the whole time — the approval gate did its job. The
passing heal demo lives in `breakme/` (see below).

## Self-healing demo (controlled break)

The demo page lives on the dashboard worker: `scrape-verse-radar.manir1179.workers.dev/breakme`
serves v1 markup by default. A "site redesign" is simulated by writing the
JS-rendered v2 markup into KV — one command, instantly reversible:

```sh
npx wrangler kv key put --binding=RADAR_KV breakme_html --path ../breakme/v2.html --remote
npx wrangler kv key delete --binding=RADAR_KV breakme_html --remote   # restore v1
```

Rehearsed flow (all verified live):

| Step | Result |
|---|---|
| run `c_msyjvrj260j7iso3o` on v1 | 3 clean rows |
| swap in v2 (content rendered client-side) | `[]` — zero rows, `HEAL_NEEDED` |
| `node scripts/heal.js c_msyjvrj260j7iso3o "<redesign prompt>" <url>` | preview shows recovered rows, `auto_save: true` publishes |
| re-run, same Collector ID | 3 clean rows again |

Two production lessons from the rehearsal are baked into the repo:

1. The CLI's `heal approve` accepts the diff into a **draft** but does not
   publish it. `scripts/heal.js` drives the AI-Flow API directly
   (`refactor_template` → poll → `resume_automation_job` with
   `{"message": true, "auto_save": true}`) so the fix actually reaches
   production — which is what makes the unattended CI heal loop real.
2. A collector generated against a page the crawler cannot reach (GitHub
   Pages, raw.githubusercontent.com and workers.dev were all 404 to the
   crawler at build time) inherits dead selectors. The demo collector was
   rebuilt against the workers.dev URL after that discovery.

## Dashboard worker

```sh
cd worker
npx wrangler login
npx wrangler kv namespace create RADAR_KV   # put the returned id in wrangler.toml
npx wrangler secret put BRIGHT_DATA_API_TOKEN
npx wrangler secret put SCRAPER_STUDIO_COLLECTOR_ID
npx wrangler deploy
```

Endpoints: `/api/notifications`, `/api/events`, `/api/health`, `/` for the
dashboard. The cron trigger runs the pipeline on schedule.

## Notes

- Public data only: FreeJobAlert publishes these notifications publicly; no
  login-walled content, no personal data.
- AI tools used (disclosed per rules): Bright Data Scraper Studio AI Agent
  (scraper generation, two self-heal attempts reviewed and rejected),
  Claude Code (pipeline, worker, dashboard, CI). All generated code reviewed
  and tested.
- Example structured output: `data/latest.json`.
- CI runs the pipeline nightly; on `HEAL_NEEDED` it heals unattended with
  `--auto-approve` and re-runs, then commits the recovered output.
