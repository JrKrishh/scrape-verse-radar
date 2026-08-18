# Demo video script (~3 min)

Everything below has been rehearsed against the live deployment. Commands in
this file are the exact ones to run on camera.

## Act 1 — The problem (30s)

1. Screen: freejobalert.com/tn-government-jobs/. Point out: no RSS icon, no
   API, plain list page, layout changes whenever the site redesigns.
2. Voice: "TN exam aspirants live on this page. TNPSC Group posts, state
   vacancies, results. When the site redesigns, scrapers people built against
   it quietly break. This build keeps the data flowing anyway — and feeds it
   into the same Cloudflare stack that powers Sangah, my Play Store exam-prep
   app."

## Act 2 — Build with the CLI (30s)

3. Terminal: `npx -p @brightdata/cli bdata scraper create
   https://www.freejobalert.com/tn-government-jobs/ "Extract each job
   notification: job title, organization name, number of vacancies, last date
   to apply, and the article link"` — cut to the finished run: Collector ID
   `c_msygw29h15ak5olz7j`.
4. `bdata scraper run c_msygw29h15ak5olz7j <url> --pretty` — show clean JSON,
   TNPSC Group 2 & 2A (821 posts) visible.
5. Show `data/latest.json` in the repo: 90 unique items, normalized + deduped.

## Act 3 — The pipeline (40s)

6. Show `scripts/pipeline.js` flow: POST /dca/trigger → poll /dca/dataset →
   normalize → validate. Then the live dashboard at
   scrape-verse-radar.manir1179.workers.dev: notifications timeline, event log,
   health badge.
7. Show the GitHub Actions run (wall of green): nightly cron runs the same
   script; validation failure flips `heal_needed` and the heal step fires.

## Act 4 — The break + heal (60s, the money shot)

8. Terminal: run the demo collector against the demo page (v1 markup):

   `bdata scraper run c_msyjvrj260j7iso3o https://scrape-verse-radar.manir1179.workers.dev/breakme --pretty`

   Three rows, clean schema.
9. The "site redesign": push the JS-rendered markup live with one command:

   `npx wrangler kv key put --binding=RADAR_KV breakme_html --path ../breakme/v2.html --remote`

   If wrangler misbehaves on Windows, the equivalent REST call:

   `Invoke-WebRequest -Uri "https://api.cloudflare.com/client/v4/accounts/87b34e4e79caec2b4dd48f199759c9fa/storage/kv/namespaces/56009b48330b401c82283e5780cc02ef/values/breakme_html" -Method Put -Headers @{Authorization="Bearer $env:CLOUDFLARE_API_TOKEN"} -ContentType "text/html" -Body (Get-Content ..\breakme\v2.html -Raw)`

   (Restore v1 the same way: delete the `breakme_html` key, and the worker
   falls back to the built-in v1 markup.)

10. Re-run the same collector command. Output: `[]`. Zero rows. State the
    validator verdict: `HEAL_NEEDED: extraction returned zero rows`.
11. Heal: `node --env-file=.env scripts/heal.js c_msyjvrj260j7iso3o
    "<prompt describing the JS redesign>" <url>` — show the preview result with
    recovered rows, then `auto_save: true` publishing the fix.
12. Re-run the same collector command: three rows again. Emphasize: same
    Collector ID, nothing downstream touched.
13. Optional cut: the same heal running unattended in GitHub Actions.

## Act 5 — Impact + close (20s)

14. "New notifications are diffed against the previous snapshot and exposed at
    /api/notifications — ready for Sangah's news worker to push to real users
    on the Play Store. The scraper now heals itself. That's the point."
15. Architecture diagram, repo URL, credits.

## Recording notes

- 1080p, terminal zoomed, no secrets visible (tokens live in .env; never echo).
- The breakme page is currently restored to v1; the KV swap in step 9 is
  instantly reversible (`wrangler kv key delete --binding=RADAR_KV breakme_html --remote`).
- If the heal runs long on camera (it polls), pre-heal before recording and
  replay the terminal scroll for the middle, then run the final verification live.
