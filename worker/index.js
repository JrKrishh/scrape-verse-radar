const API = "https://api.brightdata.com";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

function normalize(rows) {
  const seen = new Set();
  const items = [];
  for (const row of rows) {
    const list = row.job_notifications;
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const key = item.article_link || JSON.stringify(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }
  }
  return items;
}

async function triggerAndCollect(env) {
  const urls = JSON.parse(env.TARGET_URLS);
  const res = await fetch(
    `${API}/dca/trigger?collector=${env.SCRAPER_STUDIO_COLLECTOR_ID}&queue_next=1`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.BRIGHT_DATA_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(urls.map((url) => ({ url }))),
    }
  );
  if (!res.ok) throw new Error(`trigger -> HTTP ${res.status}`);
  const { collection_id } = await res.json();
  for (let i = 0; i < 60; i++) {
    const poll = await fetch(`${API}/dca/dataset?id=${collection_id}`, {
      headers: { Authorization: `Bearer ${env.BRIGHT_DATA_API_TOKEN}` },
    });
    const body = await poll.json();
    if (Array.isArray(body)) return { rows: body, snapshot: collection_id };
    await new Promise((r) => setTimeout(r, 10000));
  }
  throw new Error("snapshot never became ready");
}

function diff(previous, current) {
  const prevKeys = new Set(previous.map((r) => r.article_link || JSON.stringify(r)));
  return current.filter((r) => !prevKeys.has(r.article_link || JSON.stringify(r)));
}

export default {
  async scheduled(event, env) {
    try {
      const { rows, snapshot } = await triggerAndCollect(env);
      const items = normalize(rows);
      if (!items.length) throw new Error("extraction returned zero rows");
      const prev = (await env.RADAR_KV.get("latest", "json")) || [];
      const fresh = diff(prev, items);
      await env.RADAR_KV.put(
        "latest",
        JSON.stringify({ items, updated_at: new Date().toISOString() })
      );
      const events = (await env.RADAR_KV.get("events", "json")) || [];
      events.unshift({
        type: fresh.length ? "new_items" : "ok",
        count: fresh.length,
        snapshot,
        at: new Date().toISOString(),
      });
      await env.RADAR_KV.put("events", JSON.stringify(events.slice(0, 100)));
      await env.RADAR_KV.delete("heal_needed");
    } catch (err) {
      await env.RADAR_KV.put("heal_needed", "true");
      await env.RADAR_KV.put("last_error", err.message);
    }
  },
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/api/notifications")
      return json((await env.RADAR_KV.get("latest", "json")) || { items: [], updated_at: null });
    if (url.pathname === "/api/events") return json((await env.RADAR_KV.get("events", "json")) || []);
    if (url.pathname === "/api/health")
      return json({
        ok: true,
        collector: env.SCRAPER_STUDIO_COLLECTOR_ID,
        heal_needed: (await env.RADAR_KV.get("heal_needed")) === "true",
        last_error: await env.RADAR_KV.get("last_error"),
      });
    return new Response(DASHBOARD_HTML, { headers: { "content-type": "text/html" } });
  },
};

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Scrape-Verse Radar</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 16px;background:#0b1220;color:#e5e7eb}
  h1{font-size:1.4rem} .muted{color:#94a3b8;font-size:.85rem}
  .card{background:#111a2e;border:1px solid #1f2a44;border-radius:10px;padding:14px;margin:10px 0}
  .item{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #1f2a44}
  .item:last-child{border-bottom:none}
  .ok{color:#4ade80} .warn{color:#facc15}
</style>
</head>
<body>
<h1>Radar</h1>
<p class="muted">Self-healing TN job notification watcher. Collector c_&hellip; &middot; refreshed <span id="updated">—</span></p>
<div class="card"><strong>Health</strong>
  <div id="health" class="muted">loading&hellip;</div>
</div>
<div class="card"><strong>Event log</strong><div id="events" class="muted">loading&hellip;</div></div>
<div class="card"><strong>Latest items</strong><div id="items" class="muted">loading&hellip;</div></div>
<script>
async function load(){
  const [n,h,ev]=await Promise.all(["/api/notifications","/api/health","/api/events"].map(u=>fetch(u).then(r=>r.json())));
  document.getElementById("updated").textContent=n.updated_at||"—";
  document.getElementById("health").innerHTML=h.heal_needed?'<span class="warn">heal needed</span>':'<span class="ok">ok</span>';
  document.getElementById("events").innerHTML=ev.length?ev.map(e=>\`<div class="item"><span>\${e.type} \${e.count?"(+"+e.count+")":""}</span><span class="muted">\${e.at}</span></div>\`).join(""):"none yet";
  document.getElementById("items").innerHTML=(n.items||[]).slice(0,20).map(i=>\`<div class="item"><span>\${escapeHtml(i.job_title||"")}</span><span class="muted">\${escapeHtml(i.organization_name||"")}</span></div>\`).join("")||"none yet";
}
function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
load();
</script>
</body>
</html>`;
