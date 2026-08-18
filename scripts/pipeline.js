const fs = require("fs");
const path = require("path");

const API = "https://api.brightdata.com";
const TOKEN = process.env.BRIGHT_DATA_API_TOKEN;
const COLLECTOR = process.env.SCRAPER_STUDIO_COLLECTOR_ID;
const URLS = JSON.parse(process.env.TARGET_URLS || "[]");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function request(pathname, options = {}) {
  const res = await fetch(API + pathname, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${pathname} -> HTTP ${res.status}`);
  return res.json();
}

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

function validate(items) {
  const problems = [];
  if (!items.length) return ["extraction returned zero rows"];
  const missingTitle = items.filter((i) => !i.job_title).length;
  const missingLink = items.filter((i) => !i.article_link).length;
  const ratio = (n) => Math.round((n / items.length) * 100);
  if (ratio(missingTitle) > 50) problems.push(`job_title missing in ${ratio(missingTitle)}% of items`);
  if (ratio(missingLink) > 50) problems.push(`article_link missing in ${ratio(missingLink)}% of items`);
  return problems;
}

async function run() {
  const triggered = await request(
    `/dca/trigger?collector=${COLLECTOR}&queue_next=1`,
    { method: "POST", body: JSON.stringify(URLS.map((url) => ({ url }))) }
  );
  const snapshotId = triggered.collection_id;
  let rows = null;
  for (let i = 0; i < 180; i++) {
    const body = await request(`/dca/dataset?id=${snapshotId}`);
    if (Array.isArray(body)) {
      rows = body;
      break;
    }
    await sleep(10000);
  }
  if (!rows) throw new Error("snapshot never became ready");

  const outDir = path.join(__dirname, "..", "data");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "latest.json"),
    JSON.stringify({ items: normalize(rows), updated_at: new Date().toISOString() }, null, 2)
  );

  const problems = validate(normalize(rows));
  if (problems.length) {
    console.log(`HEAL_NEEDED: ${problems.join("; ")}`);
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, "heal_needed=1\n");
    }
    process.exit(1);
  }
  console.log(`OK: ${normalize(rows).length} unique items, snapshot ${snapshotId}`);
}

run().catch((err) => {
  console.error(`FAILED: ${err.message}`);
  process.exit(2);
});
