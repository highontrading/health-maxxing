/**
 * Outgoing email over SMTP, which every provider speaks (Resend, Postmark,
 * Amazon SES, Mailgun, Brevo, a mail server of your own).
 *
 * Configure with two environment variables:
 *   SMTP_URL    smtps://USER:PASSWORD@smtp.example.com:465
 *   EMAIL_FROM  Health Maxxing <hello@yourdomain.com>
 * Without them, nothing is sent and the admin panel says so.
 */
import nodemailer, { type Transporter } from "nodemailer";

export function emailConfigured(): boolean {
  return Boolean(process.env.SMTP_URL && process.env.EMAIL_FROM);
}

type Globals = { __hmMailer?: Transporter };
const g = globalThis as unknown as Globals;

function transport(): Transporter {
  if (!g.__hmMailer) {
    const url = new URL(process.env.SMTP_URL!);
    const secure = url.protocol === "smtps:";
    g.__hmMailer = nodemailer.createTransport({
      host: url.hostname,
      port: Number(url.port) || (secure ? 465 : 587),
      secure,
      auth: url.username ? { user: decodeURIComponent(url.username), pass: decodeURIComponent(url.password) } : undefined,
      // A pooled connection keeps a bulk send from opening one connection per message.
      pool: true,
      maxConnections: 3,
    });
  }
  return g.__hmMailer;
}

export type Mail = { to: string; subject: string; html: string; text: string; headers?: Record<string, string> };

export async function sendMail(mail: Mail): Promise<void> {
  if (!emailConfigured()) throw new Error("Email is not set up on this server (SMTP_URL and EMAIL_FROM).");
  await transport().sendMail({ from: process.env.EMAIL_FROM, ...mail });
}
