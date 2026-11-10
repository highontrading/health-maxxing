/** A plain audit trail of what staff, the API and the autopilot changed. */
import { query, run } from "./db";

export type ActivityEntry = {
  id: number;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
  createdAt: string;
};

export async function logActivity(actor: string, action: string, entity = "", entityId: string | number = "", summary = ""): Promise<void> {
  try {
    await run("INSERT INTO activity_log (actor, action, entity, entity_id, summary) VALUES (?, ?, ?, ?, ?)", [
      actor.slice(0, 80),
      action.slice(0, 40),
      entity.slice(0, 40),
      String(entityId).slice(0, 80),
      summary.slice(0, 300),
    ]);
  } catch {
    // The log must never break the action it describes.
  }
}

export async function recentActivity(limit = 50, offset = 0): Promise<ActivityEntry[]> {
  const rows = await query<{ id: number; actor: string; action: string; entity: string; entity_id: string; summary: string; created_at: string }>(
    "SELECT id, actor, action, entity, entity_id, summary, created_at FROM activity_log ORDER BY id DESC LIMIT ? OFFSET ?",
    [limit, offset],
  );
  return rows.map((r) => ({ id: r.id, actor: r.actor, action: r.action, entity: r.entity, entityId: r.entity_id, summary: r.summary, createdAt: r.created_at }));
}
