/**
 * Integration test for password reset links, against a throwaway database and
 * a throwaway SMTP server.
 *
 *   npm run test:reset
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SMTPServer } from "smtp-server";

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hm-reset-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  process.env.NEXT_PUBLIC_SITE_URL = "https://example.test";
  process.env.EMAIL_FROM = "Health Maxxing <hello@example.test>";

  const inbox: { to: string[]; raw: string }[] = [];
  const server = new SMTPServer({
    authOptional: true,
    disabledCommands: ["STARTTLS"],
    onData(stream, session, done) {
      let raw = "";
      stream.on("data", (chunk: Buffer) => (raw += chunk.toString("utf8")));
      stream.on("end", () => {
        inbox.push({ to: session.envelope.rcptTo.map((r) => r.address), raw });
        done();
      });
    },
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.SMTP_URL = `smtp://127.0.0.1:${(server.server.address() as { port: number }).port}`;

  const { run, queryOne } = await import("../src/lib/db");
  const { hashPassword, verifyPassword } = await import("../src/lib/security");
  const { createResetLink, emailResetLink, resetPassword } = await import("../src/lib/password-reset");

  const made = await run("INSERT INTO users (email, handle, name, password_hash) VALUES (?, ?, ?, ?)", ["ada@example.test", "ada", "Ada", await hashPassword("the-old-password")]);
  await run("INSERT INTO sessions (id, user_id, expires_at) VALUES ('s1', ?, '2999-01-01T00:00:00.000Z')", [made.lastId]);
  const stored = async () => (await queryOne<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", [made.lastId]))!.password_hash;

  // An unknown address sends nothing and does not throw.
  await emailResetLink("nobody@example.test");
  assert.equal(inbox.length, 0);

  // A known address gets one email with a working link.
  await emailResetLink("Ada@Example.test");
  assert.equal(inbox.length, 1);
  assert.deepEqual(inbox[0].to, ["ada@example.test"]);
  const body = inbox[0].raw.replace(/=\r?\n/g, "").replace(/=3D/g, "=");
  const token = /https:\/\/example\.test\/reset-password\?token=([A-Za-z0-9_-]+)/.exec(body)?.[1];
  assert.ok(token, "the email contains a reset link");

  // Rules for the new password are enforced before the link is spent.
  assert.equal((await resetPassword(token, "short")).ok, false);
  assert.equal((await resetPassword("not-a-real-token-at-all-000", "a-brand-new-password")).ok, false);
  assert.equal(await verifyPassword("the-old-password", await stored()), true);

  // The link sets the password once, and signs the account out everywhere.
  assert.deepEqual(await resetPassword(token, "a-brand-new-password"), { ok: true });
  assert.equal(await verifyPassword("a-brand-new-password", await stored()), true);
  assert.equal(await verifyPassword("the-old-password", await stored()), false);
  assert.equal((await queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?", [made.lastId]))?.n, 0);
  assert.equal((await resetPassword(token, "another-password-entirely")).ok, false, "a link cannot be used twice");

  // A newer link replaces an older one; an expired link is refused.
  const first = new URL(await createResetLink(made.lastId)).searchParams.get("token")!;
  const second = new URL(await createResetLink(made.lastId)).searchParams.get("token")!;
  assert.equal((await resetPassword(first, "yet-another-password")).ok, false, "an older link stops working");
  await run("UPDATE password_resets SET expires_at = '2000-01-01T00:00:00.000Z'");
  assert.equal((await resetPassword(second, "yet-another-password")).ok, false, "an expired link is refused");

  // Disabled and suspended accounts are never emailed.
  await run("UPDATE users SET banned = 1 WHERE id = ?", [made.lastId]);
  await emailResetLink("ada@example.test");
  assert.equal(inbox.length, 1);

  await new Promise<void>((resolve) => server.close(() => resolve()));
  fs.rmSync(dir, { recursive: true, force: true });
  console.log("password reset links: ok");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
