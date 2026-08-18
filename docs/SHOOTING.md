# Shooting script — record in this order, ~3:30 total

Open before rolling (in order): terminal (repo dir), browser tab 1 = Actions page,
browser tab 2 = dashboard, browser tab 3 = freejobalert TN page. Open
`docs/architecture.svg` in a viewer for Act 5.

## Take 1 — The problem (0:25)

Screen: freejobalert.com/tn-government-jobs/
Say: "TN exam aspirants live on this page. TNPSC Group 2 & 2A just dropped 821
posts here. There's no RSS feed, no API — and when this site redesigns, every
scraper built against it quietly breaks. My build keeps the data flowing
anyway, and feeds the same Cloudflare stack that powers Sangah, my exam-prep
app on the Play Store."

## Take 2 — The scraper (0:35)

Terminal. Scroll the create + run history (commands in DEMO_SCRIPT.md Act 2),
end on the live run:
Say: "One sentence to Scraper Studio, and the AI generates the collector — all
nine stages in the terminal. It returns a Collector ID that is a production
API. No deployment step."
Show `bdata scraper run c_msygw29h15ak5olz7j <url> --pretty` finishing with
clean JSON. Point at the TNPSC Group 2 & 2A row.

## Take 3 — The loop (0:40)

Browser: Actions tab.
Say: "Every night at 03:30, this runs: trigger the collector, poll the dataset,
validate every field. If extraction comes back empty or fields go missing, the
heal step fires — plain-language repair, auto-saved to production, re-run,
results committed. The wall stays green even on days the site redesigns."
Show the green check list; open one run's log briefly.

## Take 4 — Break it (0:40)

Terminal, `worker/` dir. Pre-type the KV put command, then run it:
`npx wrangler kv key put --binding=RADAR_KV breakme_html --path ../breakme/v2.html --remote`
Say: "The demo page I host is the target of a second collector. One KV write
'redesigns' the site — the content is now rendered client-side by JavaScript.
Same URL, completely different page under it."
Run the collector on the demo URL. Show `[]`.
Say: "Zero rows. The validator flags HEAL_NEEDED. This is the moment every
scraper tutorial ends — this build starts here."

## Take 5 — Heal it (0:50)

Run: `node --env-file=.env scripts/heal.js c_msyjvrj260j7iso3o "<prompt>" <url>`
While it polls, talk over it:
Say: "One plain-language prompt describes the redesign. The AI refactors the
collector, shows a preview of recovered rows, and — this matters — saves it to
production with auto_save. The CLI's approve leaves fixes in draft; my heal
engine drives the AI-Flow API directly so the fix actually ships."
Show the preview_result + HEAL_DONE lines.
Re-run the collector: 3 rows.
Say: "Same Collector ID. Nothing downstream touched. That's self-healing."

## Take 6 — Impact (0:30)

Screen: architecture.svg, then the dashboard.
Say: "New notifications are diffed against the last snapshot and exposed at
/api/notifications — a stable feed ready for Sangah's news worker, so real
users on the Play Store see new exam posts the day they drop, even when the
site breaks under us."
Show dashboard: items list, health ok, event log.
Close: repo URL on screen.

## Cut notes

- If a poll runs long, keep talking (Take 5 has 50s of material) or cut
  mid-poll to the result and note "four minutes later".
- Restore the demo page after recording:
  `npx wrangler kv key delete --binding=RADAR_KV breakme_html --remote`
- No secrets on screen: tokens live in .env, never echo them.
- 1080p, terminal font 16+, window maximized.
