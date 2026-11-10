/**
 * Integration test for newsletter sending: starts a throwaway SMTP server and
 * a throwaway database, sends an issue, and checks who got what.
 *
 *   npm run test:newsletter
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SMTPServer } from "smtp-server";

type Received = { to: string[]; raw: string };

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hm-newsletter-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  process.env.NEXT_PUBLIC_SITE_URL = "https://example.test";
  process.env.EMAIL_FROM = "Health Maxxing <news@example.test>";

  const inbox: Received[] = [];
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
  const port = (server.server.address() as { port: number }).port;
  process.env.SMTP_URL = `smtp://127.0.0.1:${port}`;

  // Import after the environment is set: the modules read it when first used.
  const { run } = await import("../src/lib/db");
  const { sendIssue, sendStatus, sendTestIssue } = await import("../src/lib/newsletter-send");

  const issue = await run(
    "INSERT INTO newsletter_issues (slug, number, title, preheader, body, status, published_at) VALUES (?, ?, ?, ?, ?, 'published', ?)",
    ["test-issue", 7, "Seven things about sleep", "A short preview line.", "Hello.\n\n## A heading\n\nRead [the guide](/articles/how-much-sleep-do-you-need).[^1]\n\n> [!TIP]\n> Go to bed.", new Date().toISOString()],
  );
  const add = (email: string, status = "active") => run("INSERT INTO subscribers (email, token, status) VALUES (?, ?, ?)", [email, `tok_${email.replace(/\W/g, "")}_padding12345`, status]);
  await add("ada@example.test");
  await add("ben@example.test");
  await add("gone@example.test", "unsubscribed");

  // A test send goes to one address and records nothing.
  const test = await sendTestIssue(issue.lastId, "me@example.test");
  assert.equal(test.ok, true, test.message);
  assert.deepEqual(inbox.at(-1)?.to, ["me@example.test"]);
  assert.equal((await sendStatus(issue.lastId)).sent, 0);

  // The real send reaches active subscribers only.
  const first = await sendIssue(issue.lastId, "test");
  assert.equal(first.sent, 2, first.message);
  assert.equal(first.remaining, 0);
  const recipients = inbox.slice(1).flatMap((m) => m.to).sort();
  assert.deepEqual(recipients, ["ada@example.test", "ben@example.test"]);

  // Unfold long headers and decode the quoted-printable body enough to search it.
  const ada = inbox
    .find((m) => m.to[0] === "ada@example.test")!
    .raw.replace(/\r?\n[ \t]+/g, " ")
    .replace(/=\r?\n/g, "")
    .replace(/=3D/g, "=");
  assert.match(ada, /List-Unsubscribe: <https:\/\/example\.test\/api\/newsletter\/unsubscribe\?token=tok_adaexampletest_padding12345>/);
  assert.match(ada, /List-Unsubscribe-Post: List-Unsubscribe=One-Click/);
  assert.match(ada, /https:\/\/example\.test\/newsletter\/unsubscribe\?token=tok_adaexampletest_padding12345/, "visible unsubscribe link");
  assert.match(ada, /href="https:\/\/example\.test\/articles\/how-much-sleep-do-you-need"/, "site links are made absolute");
  assert.match(ada, /https:\/\/example\.test\/newsletter\/test-issue/, "read-on-the-web link");
  assert.match(ada, /Subject: Seven things about sleep/);
  assert.match(ada, /From: Health Maxxing <news@example\.test>/);

  // Sending again emails nobody; a new subscriber gets only the issue they missed.
  const again = await sendIssue(issue.lastId, "test");
  assert.equal(again.sent, 0);
  await add("cat@example.test");
  const third = await sendIssue(issue.lastId, "test");
  assert.equal(third.sent, 1);
  assert.deepEqual(inbox.at(-1)?.to, ["cat@example.test"]);
  assert.equal((await sendStatus(issue.lastId)).sent, 3);

  await new Promise<void>((resolve) => server.close(() => resolve()));
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`newsletter sending: ok (${inbox.length} messages delivered to the test server)`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
