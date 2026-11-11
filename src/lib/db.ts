/**
 * Database access. One libSQL client per process.
 *
 * - Local/default: a SQLite file at ./data/health-maxxing.db (created on demand).
 * - Hosted: set DATABASE_URL (libsql://… or https://…) and DATABASE_AUTH_TOKEN
 *   to use a remote libSQL/Turso database, e.g. on serverless hosts.
 *
 * This module has no Next.js imports so scripts can use it through tsx.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient, type Client, type InArgs, type InStatement, type InValue } from "@libsql/client";
import { MIGRATIONS } from "./db-schema";

export type { InValue };

type Globals = { __hmDb?: Client; __hmDbReady?: Promise<void> };
const g = globalThis as unknown as Globals;

export function databaseUrl(): string {
  return process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || "file:./data/health-maxxing.db";
}

export function isLocalDatabase(): boolean {
  return databaseUrl().startsWith("file:");
}

function client(): Client {
  if (!g.__hmDb) {
    const url = databaseUrl();
    if (url.startsWith("file:")) {
      const file = url.slice("file:".length);
      fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    }
    g.__hmDb = createClient({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined,
    });
  }
  return g.__hmDb;
}

async function migrate(c: Client): Promise<void> {
  if (isLocalDatabase()) {
    // Wait when the file is busy, and say so before anything else: the build opens the database from
    // several workers at once, and after an unclean stop the first of them holds a lock while it
    // recovers the journal. Without the timeout the others failed at once with "database is locked".
    await c.execute("PRAGMA busy_timeout = 8000");
    // WAL lets those workers read while something else writes.
    await c.execute("PRAGMA journal_mode = WAL");
    await c.execute("PRAGMA foreign_keys = ON");
  }
  await c.execute("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
  const readVersion = async () => {
    const row = await c.execute("SELECT value FROM meta WHERE key = 'schema_version'");
    return row.rows.length ? Number(row.rows[0][0]) : 0;
  };
  let version = await readVersion();
  while (version < MIGRATIONS.length) {
    const statements = MIGRATIONS[version]
      .split(/;\s*(?:\n|$)/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await c.batch(
        [
          ...statements,
          {
            sql: "INSERT INTO meta (key, value) VALUES ('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            args: [String(version + 1)],
          },
        ],
        "write",
      );
      version += 1;
    } catch (err) {
      // Several processes can start at once (build workers, serverless instances).
      // If another one applied this migration first, ours fails on "already exists":
      // carry on from the version the database now reports.
      const current = await readVersion();
      if (current <= version) throw err;
      version = current;
    }
  }
}

/** Returns the client after making sure the schema is up to date. */
export async function db(): Promise<Client> {
  const c = client();
  g.__hmDbReady ??= migrate(c).catch((err) => {
    g.__hmDbReady = undefined;
    throw err;
  });
  await g.__hmDbReady;
  return c;
}

export type Row = Record<string, unknown>;

function toPlain(columns: string[], row: ArrayLike<unknown>): Row {
  const out: Row = {};
  for (let i = 0; i < columns.length; i++) {
    const v = row[i];
    out[columns[i]] = typeof v === "bigint" ? Number(v) : v;
  }
  return out;
}

/** Run a query and return plain objects (safe to cache and serialize). */
export async function query<T = Row>(sql: string, args: InArgs = []): Promise<T[]> {
  const c = await db();
  const rs = await c.execute({ sql, args });
  return rs.rows.map((r) => toPlain(rs.columns, r)) as T[];
}

export async function queryOne<T = Row>(sql: string, args: InArgs = []): Promise<T | null> {
  const rows = await query<T>(sql, args);
  return rows[0] ?? null;
}

export async function run(sql: string, args: InArgs = []): Promise<{ changes: number; lastId: number }> {
  const c = await db();
  const rs = await c.execute({ sql, args });
  return { changes: rs.rowsAffected, lastId: Number(rs.lastInsertRowid ?? 0) };
}

/** Run several statements atomically. */
export async function batch(statements: InStatement[]): Promise<void> {
  if (!statements.length) return;
  const c = await db();
  await c.batch(statements, "write");
}

export function json<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}
