/**
 * One-time password reset links. A link works once, for an hour. It can be
 * emailed to the member (when email is set up) or handed over by an admin.
 */
import { batch, queryOne, run } from "./db";
import { emailConfigured, sendMail } from "./email";
import { hashPassword, randomToken, sha256 } from "./security";
import { siteUrl } from "./site";

const VALID_MINUTES = 60;

/** Creates a link for the account. Earlier unused links for it stop working. */
export async function createResetLink(userId: number): Promise<string> {
  const token = randomToken(32);
  const now = new Date();
  await batch([
    { sql: "DELETE FROM password_resets WHERE user_id = ? OR expires_at < ?", args: [userId, now.toISOString()] },
    {
      sql: "INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
      args: [sha256(token), userId, new Date(now.getTime() + VALID_MINUTES * 60_000).toISOString()],
    },
  ]);
  return `${siteUrl()}/reset-password?token=${token}`;
}

/**
 * Emails a reset link if the address belongs to an account that can sign in.
 * Returns nothing either way, so callers cannot tell whether an address exists.
 */
export async function emailResetLink(email: string): Promise<void> {
  if (!emailConfigured()) return;
  const user = await queryOne<{ id: number; name: string; password_hash: string; banned: number }>(
    "SELECT id, name, password_hash, banned FROM users WHERE email = ?",
    [email.trim().toLowerCase()],
  );
  if (!user || user.banned || user.password_hash === "!disabled") return;
  const link = await createResetLink(user.id);
  const text = `Hello ${user.name},\n\nSomeone asked to reset the password for your Health Maxxing account. If that was you, open this link within an hour to choose a new one:\n\n${link}\n\nIf it was not you, ignore this email and your password stays as it is.\n`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#262422;max-width:520px">
<p>Hello ${user.name.replace(/[<>&"]/g, "")},</p>
<p>Someone asked to reset the password for your Health Maxxing account. If that was you, choose a new one within an hour:</p>
<p><a href="${link}" style="display:inline-block;background:#262422;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px">Choose a new password</a></p>
<p style="color:#7b756e;font-size:14px">If it was not you, ignore this email and your password stays as it is.</p>
</div>`;
  await sendMail({ to: email.trim().toLowerCase(), subject: "Reset your Health Maxxing password", html, text });
}

/** Sets a new password with a valid link, and signs the account out everywhere. */
export async function resetPassword(token: string, password: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return { ok: false, message: "That reset link is not valid. Ask for a new one." };
  const row = await queryOne<{ user_id: number; role: string }>(
    `SELECT r.user_id, u.role FROM password_resets r JOIN users u ON u.id = r.user_id
     WHERE r.token_hash = ? AND r.used_at IS NULL AND r.expires_at > ?`,
    [sha256(token), new Date().toISOString()],
  );
  if (!row) return { ok: false, message: "That reset link has expired or was already used. Ask for a new one." };
  const minimum = row.role === "member" ? 8 : 10;
  if (password.length < minimum) return { ok: false, message: `Use at least ${minimum} characters.` };
  if (password.length > 200) return { ok: false, message: "That password is too long." };
  await run("UPDATE users SET password_hash = ? WHERE id = ?", [await hashPassword(password), row.user_id]);
  await batch([
    { sql: "UPDATE password_resets SET used_at = ? WHERE token_hash = ?", args: [new Date().toISOString(), sha256(token)] },
    { sql: "DELETE FROM sessions WHERE user_id = ?", args: [row.user_id] },
  ]);
  return { ok: true };
}
