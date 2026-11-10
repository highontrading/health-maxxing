/**
 * Turning a newsletter issue into email and sending it to subscribers.
 * Each delivery is recorded, so a send that stops halfway can be resumed
 * without anyone receiving the issue twice.
 */
import { logActivity } from "./activity";
import { loadSettingsFresh } from "./admin/settings-store";
import { query, queryOne, run } from "./db";
import { emailConfigured, sendMail } from "./email";
import { markdownToText, renderMarkdown } from "./markdown";
import { siteUrl } from "./site";

type Issue = { id: number; slug: string; number: number; title: string; preheader: string; body: string; status: string };

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Email clients need absolute links and their styles in the message itself. */
export function renderIssueEmail(issue: Issue, opts: { siteName: string; newsletterName: string; unsubscribeUrl: string }): { html: string; text: string } {
  const base = siteUrl();
  const webUrl = `${base}/newsletter/${issue.slug}`;
  const body = renderMarkdown(issue.body).html.replace(/href="\//g, `href="${base}/`);
  const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(issue.title)}</title>
<style>
  .hm-body h2 { font-size: 22px; line-height: 1.25; margin: 32px 0 10px; font-weight: 600; }
  .hm-body h3 { font-size: 18px; line-height: 1.3; margin: 24px 0 8px; font-weight: 600; }
  .hm-body p, .hm-body li { font-size: 17px; line-height: 1.65; }
  .hm-body p { margin: 0 0 16px; }
  .hm-body ul, .hm-body ol { margin: 0 0 16px; padding-left: 24px; }
  .hm-body a { color: #262422; text-decoration: underline; }
  .hm-body blockquote { margin: 0 0 16px; padding: 2px 0 2px 16px; border-left: 3px solid #c4f04a; }
  .hm-body table { border-collapse: collapse; width: 100%; margin: 0 0 16px; font-size: 15px; }
  .hm-body th, .hm-body td { border-bottom: 1px solid #e2dbd0; padding: 8px 6px; text-align: left; }
  .hm-body .callout { background: #f6f3ee; border-radius: 14px; padding: 14px 16px; margin: 0 0 16px; }
  .hm-body .callout-title { font-weight: 700; margin: 0 0 4px; }
  .hm-body sup { display: none; }
</style>
</head>
<body style="margin:0;padding:0;background:#f6f3ee;color:#262422;font-family:${font};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(issue.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ee;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-radius:22px;">
<tr><td style="padding:28px 32px 0;font-family:${font};">
  <p style="margin:0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#7b756e;">${escapeHtml(opts.newsletterName)} · No. ${issue.number}</p>
  <h1 style="margin:10px 0 0;font-size:30px;line-height:1.15;font-weight:500;letter-spacing:-0.02em;">${escapeHtml(issue.title)}</h1>
</td></tr>
<tr><td class="hm-body" style="padding:22px 32px 30px;font-family:${font};">${body}</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;">
<tr><td style="padding:18px 20px;font-family:${font};font-size:13px;line-height:1.6;color:#7b756e;text-align:center;">
  You are getting this because you subscribed to ${escapeHtml(opts.newsletterName)} from ${escapeHtml(opts.siteName)}.<br>
  <a href="${webUrl}" style="color:#7b756e;">Read it on the web</a> &nbsp;·&nbsp; <a href="${opts.unsubscribeUrl}" style="color:#7b756e;">Unsubscribe</a><br>
  This email is general information, not medical advice.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  const text = `${issue.title}\n${opts.newsletterName} · No. ${issue.number}\n\n${markdownToText(issue.body)}\n\n--\nRead it on the web: ${webUrl}\nUnsubscribe: ${opts.unsubscribeUrl}\nThis email is general information, not medical advice.\n`;
  return { html, text };
}

async function loadIssue(id: number): Promise<Issue | null> {
  return queryOne<Issue>("SELECT id, slug, number, title, preheader, body, status FROM newsletter_issues WHERE id = ?", [id]);
}

export type SendStatus = { configured: boolean; published: boolean; subscribers: number; sent: number; remaining: number };

export async function sendStatus(issueId: number): Promise<SendStatus> {
  const r = await queryOne<{ status: string; subscribers: number; sent: number; remaining: number }>(
    `SELECT (SELECT status FROM newsletter_issues WHERE id = ?1) AS status,
            (SELECT COUNT(*) FROM subscribers WHERE status = 'active') AS subscribers,
            (SELECT COUNT(*) FROM newsletter_sends WHERE issue_id = ?1) AS sent,
            (SELECT COUNT(*) FROM subscribers s WHERE s.status = 'active'
               AND NOT EXISTS (SELECT 1 FROM newsletter_sends n WHERE n.issue_id = ?1 AND n.subscriber_id = s.id)) AS remaining`,
    [issueId],
  );
  return {
    configured: emailConfigured(),
    published: r?.status === "published",
    subscribers: Number(r?.subscribers ?? 0),
    sent: Number(r?.sent ?? 0),
    remaining: Number(r?.remaining ?? 0),
  };
}

const unsubscribeLinks = (token: string) => ({
  page: `${siteUrl()}/newsletter/unsubscribe?token=${token}`,
  oneClick: `${siteUrl()}/api/newsletter/unsubscribe?token=${token}`,
});

export async function sendTestIssue(issueId: number, to: string): Promise<{ ok: boolean; message: string }> {
  const issue = await loadIssue(issueId);
  if (!issue) return { ok: false, message: "That issue no longer exists." };
  const settings = await loadSettingsFresh();
  const { html, text } = renderIssueEmail(issue, { siteName: settings.site.name, newsletterName: settings.newsletter.name, unsubscribeUrl: `${siteUrl()}/newsletter` });
  try {
    await sendMail({ to, subject: `[Test] ${issue.title}`, html, text });
    return { ok: true, message: `Test sent to ${to}.` };
  } catch (error) {
    return { ok: false, message: `The test could not be sent: ${error instanceof Error ? error.message : "unknown error"}` };
  }
}

/**
 * Send the issue to every active subscriber who has not had it yet.
 * Works for up to `budgetMs`, then stops so the request can finish; call it
 * again to continue.
 */
export async function sendIssue(issueId: number, actor: string, budgetMs = 240_000): Promise<{ ok: boolean; sent: number; failed: number; remaining: number; message: string }> {
  const issue = await loadIssue(issueId);
  if (!issue) return { ok: false, sent: 0, failed: 0, remaining: 0, message: "That issue no longer exists." };
  if (issue.status !== "published") return { ok: false, sent: 0, failed: 0, remaining: 0, message: "Publish the issue first, so the “read it on the web” link works." };
  if (!emailConfigured()) return { ok: false, sent: 0, failed: 0, remaining: 0, message: "Email is not set up on this server." };

  const settings = await loadSettingsFresh();
  const started = Date.now();
  let sent = 0;
  let failed = 0;
  let streak = 0;
  let lastError = "";

  while (Date.now() - started < budgetMs && streak < 5) {
    const batch = await query<{ id: number; email: string; token: string }>(
      `SELECT s.id, s.email, s.token FROM subscribers s WHERE s.status = 'active'
         AND NOT EXISTS (SELECT 1 FROM newsletter_sends n WHERE n.issue_id = ? AND n.subscriber_id = s.id)
       ORDER BY s.id LIMIT 50 OFFSET ?`,
      [issueId, failed],
    );
    if (!batch.length) break;
    for (const subscriber of batch) {
      if (Date.now() - started >= budgetMs || streak >= 5) break;
      const links = unsubscribeLinks(subscriber.token);
      const { html, text } = renderIssueEmail(issue, { siteName: settings.site.name, newsletterName: settings.newsletter.name, unsubscribeUrl: links.page });
      try {
        await sendMail({
          to: subscriber.email,
          subject: issue.title,
          html,
          text,
          // Lets mail apps show their own one-click "unsubscribe" button.
          headers: { "List-Unsubscribe": `<${links.oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        });
        await run("INSERT OR IGNORE INTO newsletter_sends (issue_id, subscriber_id) VALUES (?, ?)", [issueId, subscriber.id]);
        sent++;
        streak = 0;
      } catch (error) {
        failed++;
        streak++;
        lastError = error instanceof Error ? error.message : "unknown error";
      }
    }
  }

  const status = await sendStatus(issueId);
  await run("UPDATE newsletter_issues SET sent_at = COALESCE(sent_at, ?), sent_count = ? WHERE id = ?", [new Date().toISOString(), status.sent, issueId]);
  if (sent) await logActivity(actor, "sent", "newsletter", issueId, `${issue.title} to ${sent} ${sent === 1 ? "subscriber" : "subscribers"}`);

  const parts = [`${sent} sent`];
  if (failed) parts.push(`${failed} failed (${lastError})`);
  if (status.remaining) parts.push(`${status.remaining} still to go`);
  const stoppedOnErrors = streak >= 5;
  return {
    ok: !failed && !status.remaining,
    sent,
    failed,
    remaining: status.remaining,
    message: `${parts.join(", ")}.${stoppedOnErrors ? " Stopped after repeated errors: check the email settings, then continue." : status.remaining ? " Press the button again to continue." : ""}`,
  };
}
