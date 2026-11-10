"use server";

import { z } from "zod";
import { queryOne, run } from "@/lib/db";
import { limitByClient } from "@/lib/rate-limit";
import { randomToken } from "@/lib/security";
import { echo, type FormState } from "./types";

const emailSchema = z.string().trim().toLowerCase().email().max(200);

export async function subscribeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (String(formData.get("website") ?? "")) return { ok: true, message: "You're in. See you in your inbox." }; // honeypot
  const parsed = emailSchema.safeParse(formData.get("email"));
  const values = echo(formData, ["email"]);
  if (!parsed.success) return { message: "Please enter a valid email address.", values };
  if (!(await limitByClient("subscribe", 6, 3600))) return { message: "Too many sign-ups from here. Try again later.", values };

  const email = parsed.data;
  const source = String(formData.get("source") ?? "site").slice(0, 40);
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const existing = await queryOne<{ id: number; status: string }>("SELECT id, status FROM subscribers WHERE email = ?", [email]);
  if (existing) {
    if (existing.status !== "active") {
      await run("UPDATE subscribers SET status = 'active', unsubscribed_at = NULL WHERE id = ?", [existing.id]);
      return { ok: true, message: "Welcome back. You're subscribed again." };
    }
    return { ok: true, message: "You're already on the list. Good taste." };
  }
  await run("INSERT INTO subscribers (email, name, token, source) VALUES (?, ?, ?, ?)", [email, name, randomToken(24), source]);
  return { ok: true, message: "You're in. See you in your inbox." };
}

export async function unsubscribeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return { message: "That unsubscribe link is not valid." };
  const res = await run(
    "UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = ? WHERE token = ? AND status = 'active'",
    [new Date().toISOString(), token],
  );
  return res.changes
    ? { ok: true, message: "You have been unsubscribed. No hard feelings." }
    : { ok: true, message: "You are already unsubscribed." };
}

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please tell us your name.").max(80),
  email: emailSchema,
  subject: z.string().trim().max(120),
  message: z.string().trim().min(10, "Please write a little more.").max(4000, "Please keep it under 4,000 characters."),
});

export async function contactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (String(formData.get("website") ?? "")) return { ok: true, message: "Thanks. We have your message." };
  const values = echo(formData, ["name", "email", "subject", "message"]);
  if (!(await limitByClient("contact", 4, 3600))) return { message: "Too many messages from here. Try again later.", values };
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject") ?? "",
    message: formData.get("message"),
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      errors[String(issue.path[0])] ??= issue.path[0] === "email" ? "Please enter a valid email address." : issue.message;
    }
    return { errors, values };
  }
  const { name, email, subject, message } = parsed.data;
  await run("INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)", [name, email, subject, message]);
  return { ok: true, message: "Thanks. We have your message and will reply by email." };
}
