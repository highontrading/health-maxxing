// Shared helpers for the browser tests.
const fs = require("fs");
const os = require("os");
const path = require("path");

const BASE = process.env.BASE || "http://localhost:3000";

/** Admin login: ADMIN_EMAIL / ADMIN_PASSWORD, or the generated data/admin-credentials.txt. */
function adminCredentials() {
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) return { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD };
  const file = path.join(__dirname, "..", "..", "data", "admin-credentials.txt");
  if (!fs.existsSync(file)) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD, or start the app once so data/admin-credentials.txt exists.");
  const text = fs.readFileSync(file, "utf8");
  return { email: /Email:\s+(\S+)/.exec(text)[1], password: /Password:\s+(\S+)/.exec(text)[1] };
}

/** A scratch file in the system temp folder. */
const tmpFile = (name) => path.join(os.tmpdir(), `hm-e2e-${name}`);

module.exports = { BASE, adminCredentials, tmpFile };
