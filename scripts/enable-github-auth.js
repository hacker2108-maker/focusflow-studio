#!/usr/bin/env node
/**
 * Enable GitHub OAuth in Supabase via Management API.
 * Run: npm run enable-github-auth
 * Add to .env: SUPABASE_ACCESS_TOKEN=your_token
 * Get token: https://supabase.com/dashboard/account/tokens
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = "bimifcjflwuekavtswvc";
const GITHUB_CLIENT_ID = "Ov23ctH4svbBvROTxUx7";
const GITHUB_CLIENT_SECRET = "25da40c680d8e49e0617ebb5792bc4b6ebd27554";

let token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  const envPath = join(__dirname, "..", ".env");
  if (existsSync(envPath)) {
    const env = readFileSync(envPath, "utf8");
    const m = env.match(/SUPABASE_ACCESS_TOKEN\s*=\s*["']?([^"'\s]+)/);
    if (m) token = m[1].trim();
  }
}
if (!token) {
  console.error("Set SUPABASE_ACCESS_TOKEN (get from https://supabase.com/dashboard/account/tokens)");
  process.exit(1);
}

async function enable() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_github_enabled: true,
      external_github_client_id: GITHUB_CLIENT_ID,
      external_github_secret: GITHUB_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Failed:", res.status, err);
    process.exit(1);
  }
  console.log("GitHub OAuth enabled successfully!");
}

enable().catch((e) => {
  console.error(e);
  process.exit(1);
});
