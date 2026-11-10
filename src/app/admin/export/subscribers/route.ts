import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";
import { getSessionUser } from "@/lib/auth";
import { query } from "@/lib/db";

/** Quote a CSV cell, and defuse values a spreadsheet would run as a formula. */
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** GET /admin/export/subscribers — the subscriber list as CSV. Admins only. */
export async function GET() {
  const user = await getSessionUser();
  if (!user || user.banned || user.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const rows = await query<{ email: string; name: string; status: string; source: string; created_at: string }>(
    "SELECT email, name, status, source, created_at FROM subscribers ORDER BY created_at",
  );
  const lines = ["email,name,status,source,subscribed_at", ...rows.map((r) => [r.email, r.name, r.status, r.source, r.created_at].map(cell).join(","))];
  await logActivity(`${user.name} (@${user.handle})`, "exported", "subscribers", "", `${rows.length} rows`);
  return new NextResponse(`${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="health-maxxing-subscribers.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
