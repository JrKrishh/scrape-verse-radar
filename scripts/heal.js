const API = "https://api.brightdata.com";
const TOKEN = process.env.BRIGHT_DATA_API_TOKEN;
const COLLECTOR = process.argv[2];
const PROMPT = process.argv[3];
const INPUT_URL = process.argv[4];

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
  const text = await res.text();
  if (!res.ok) throw new Error(`${pathname} -> HTTP ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  if (!COLLECTOR || !PROMPT) {
    console.error("usage: node scripts/heal.js <collector_id> \"<prompt>\" [input_url]");
    process.exit(2);
  }
  const body = { prompt: PROMPT };
  if (INPUT_URL) body.custom_input = [{ url: INPUT_URL }];
  console.log("triggering refactor...");
  await request(`/dca/collectors/${COLLECTOR}/refactor_template`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  for (let i = 0; i < 300; i++) {
    const progress = await request(`/dca/collectors/${COLLECTOR}/refactor_template/progress`);
    if (progress.status === "pending_answer") {
      console.log("awaiting approval, preview:", JSON.stringify(progress.preview_result || progress).slice(0, 400));
      await request(`/dca/collectors/${COLLECTOR}/resume_automation_job`, {
        method: "POST",
        body: JSON.stringify({ message: true, auto_save: true }),
      });
      console.log("approved with auto_save=true (production updated)");
      for (let j = 0; j < 300; j++) {
        const after = await request(`/dca/collectors/${COLLECTOR}/refactor_template/progress`);
        if (after.status === "done") {
          console.log("HEAL_DONE: template saved to production");
          return;
        }
        if (after.status === "failed") {
          console.error("HEAL_FAILED:", JSON.stringify(after).slice(0, 400));
          process.exit(1);
        }
        await sleep(10000);
      }
      console.error("HEAL_TIMEOUT after approval");
      process.exit(1);
    }
    if (progress.status === "failed") {
      console.error("HEAL_FAILED:", JSON.stringify(progress).slice(0, 400));
      process.exit(1);
    }
    await sleep(10000);
  }
  console.error("HEAL_TIMEOUT waiting for approval gate");
  process.exit(1);
}

main().catch((err) => {
  console.error(`FAILED: ${err.message}`);
  process.exit(2);
});
