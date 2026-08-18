# LinkedIn post drafts (Daily Bugle track)

Pick one, tweak the voice, tag WeMakeDevs. Post mid-week, then a follow-up on
submission day with the demo video link. Human voice — no AI-tool branding.

## Option A — the break story (recommended)

Building a self-healing scraper for @WeMakeDevs #ScrapeVerse this week.

The target: FreeJobAlert's Tamil Nadu jobs page. No RSS, no API, and it
redesigns whenever it feels like it. TNPSC Group 2 & 2A dropped 821 posts last
week — aspirants found out late because their scrapers quietly died.

So I built mine to break loudly: a nightly run validates every field, and when
extraction comes back empty, it heals itself in place and re-runs. Same
collector ID, nothing downstream touched.

The fun part was proving it: I host a demo page, swapped in a JS-rendered
"redesign" mid-demo, watched the collector return zero rows, then watched a
one-line heal bring it back to full output.

Repo: https://github.com/JrKrishh/scrape-verse-radar

## Option B — the process story

Spent this week in @WeMakeDevs Scrape-Verse turning "the site changed and my
scraper broke" from a Monday problem into a solved problem.

What I built: a TN job-notification watcher on Bright Data Scraper Studio that
runs nightly in CI, diff-checks the output, and when the site moves under it,
fires a plain-language heal — auto-approved, re-run, results committed. The
Actions tab is a wall of green, even on days the site redesigned.

Also learned: the CLI's heal approve saves to draft, not production. Drove the
AI-Flow API directly with auto_save instead. That's the difference between a
demo and a pipeline that actually survives.

## Option C — short + impact

TNPSC aspirants refresh one webpage every morning. When it redesigns, they miss
exam windows.

My Scrape-Verse build watches that page with a self-healing scraper: it breaks,
notices, heals itself, and keeps the data flowing into an app with real users
on the Play Store.

Same collector ID through the whole recovery. That's the part that matters.

@WeMakeDevs #ScrapeVerse
