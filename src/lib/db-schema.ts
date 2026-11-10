/**
 * Database schema, as ordered migrations. Append a new string to change the
 * schema; never edit one that has shipped. Statements are split on ";" at the
 * end of a line, so do not use triggers or semicolons inside string literals.
 */

const EDITORIAL = `
  status TEXT NOT NULL DEFAULT 'published',
  origin TEXT NOT NULL DEFAULT 'admin',
  seed_hash TEXT,
  edited INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
`;

const V1 = `
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  handle TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  bio TEXT NOT NULL DEFAULT '',
  sticker TEXT NOT NULL DEFAULT 'smile',
  color TEXT NOT NULL DEFAULT 'lime',
  banned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_seen_at TEXT
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expires_at TEXT NOT NULL,
  user_agent TEXT NOT NULL DEFAULT ''
);
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'lime',
  sticker TEXT NOT NULL DEFAULT 'heart',
  sort_order INTEGER NOT NULL DEFAULT 100,
  ${EDITORIAL}
);

CREATE TABLE body_systems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'lime',
  sticker TEXT NOT NULL DEFAULT 'heart',
  organs TEXT NOT NULL DEFAULT '[]',
  categories TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 100,
  ${EDITORIAL}
);

CREATE TABLE articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  dek TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  sticker TEXT NOT NULL DEFAULT 'heart',
  kind TEXT NOT NULL DEFAULT 'guide',
  cover_image TEXT NOT NULL DEFAULT '',
  cover_alt TEXT NOT NULL DEFAULT '',
  cover_credit TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  takeaways TEXT NOT NULL DEFAULT '[]',
  faqs TEXT NOT NULL DEFAULT '[]',
  sources TEXT NOT NULL DEFAULT '[]',
  related TEXT NOT NULL DEFAULT '[]',
  author TEXT NOT NULL DEFAULT 'Health Maxxing Editors',
  featured INTEGER NOT NULL DEFAULT 0,
  reading_minutes INTEGER NOT NULL DEFAULT 1,
  word_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 1000,
  published_at TEXT,
  reviewed_at TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  fact_check TEXT NOT NULL DEFAULT 'pending',
  ${EDITORIAL}
);
CREATE INDEX articles_category ON articles(category, status);
CREATE INDEX articles_published ON articles(status, published_at);

CREATE TABLE conditions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  aka TEXT NOT NULL DEFAULT '[]',
  system TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  symptoms TEXT NOT NULL DEFAULT '[]',
  urgent TEXT NOT NULL DEFAULT '[]',
  body TEXT NOT NULL DEFAULT '',
  sources TEXT NOT NULL DEFAULT '[]',
  reviewed_at TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  fact_check TEXT NOT NULL DEFAULT 'pending',
  ${EDITORIAL}
);
CREATE INDEX conditions_system ON conditions(system, status);

CREATE TABLE glossary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  term TEXT NOT NULL,
  definition TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  see_also TEXT NOT NULL DEFAULT '[]',
  ${EDITORIAL}
);

CREATE TABLE myths (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  myth TEXT NOT NULL,
  verdict TEXT NOT NULL DEFAULT 'false',
  answer TEXT NOT NULL DEFAULT '',
  explanation TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  sticker TEXT NOT NULL DEFAULT 'cross',
  sources TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 1000,
  ${EDITORIAL}
);

CREATE TABLE foods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  food_group TEXT NOT NULL DEFAULT 'vegetables',
  fdc_id INTEGER,
  serving_label TEXT NOT NULL DEFAULT '100 g',
  serving_grams REAL NOT NULL DEFAULT 100,
  kcal REAL NOT NULL DEFAULT 0,
  protein REAL NOT NULL DEFAULT 0,
  carbs REAL NOT NULL DEFAULT 0,
  fiber REAL NOT NULL DEFAULT 0,
  sugars REAL NOT NULL DEFAULT 0,
  fat REAL NOT NULL DEFAULT 0,
  sat_fat REAL NOT NULL DEFAULT 0,
  sodium_mg REAL NOT NULL DEFAULT 0,
  micros TEXT NOT NULL DEFAULT '[]',
  note TEXT NOT NULL DEFAULT '',
  ${EDITORIAL}
);

CREATE TABLE exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'strength',
  pattern TEXT NOT NULL DEFAULT '',
  primary_muscles TEXT NOT NULL DEFAULT '[]',
  secondary_muscles TEXT NOT NULL DEFAULT '[]',
  equipment TEXT NOT NULL DEFAULT '[]',
  level TEXT NOT NULL DEFAULT 'beginner',
  summary TEXT NOT NULL DEFAULT '',
  steps TEXT NOT NULL DEFAULT '[]',
  cues TEXT NOT NULL DEFAULT '[]',
  mistakes TEXT NOT NULL DEFAULT '[]',
  easier TEXT NOT NULL DEFAULT '',
  harder TEXT NOT NULL DEFAULT '',
  ${EDITORIAL}
);

CREATE TABLE pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  ${EDITORIAL}
);

CREATE TABLE newsletter_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  preheader TEXT NOT NULL DEFAULT '',
  sticker TEXT NOT NULL DEFAULT 'mail',
  body TEXT NOT NULL DEFAULT '',
  published_at TEXT,
  sent_at TEXT,
  sent_count INTEGER NOT NULL DEFAULT 0,
  ${EDITORIAL}
);

CREATE TABLE subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  token TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'site',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  unsubscribed_at TEXT
);

CREATE TABLE forum_boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sticker TEXT NOT NULL DEFAULT 'chat',
  color TEXT NOT NULL DEFAULT 'lime',
  sort_order INTEGER NOT NULL DEFAULT 100,
  ${EDITORIAL}
);

CREATE TABLE forum_threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id INTEGER NOT NULL REFERENCES forum_boards(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  locked INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  reply_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  seed_key TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_post_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_post_user_id INTEGER
);
CREATE INDEX forum_threads_board ON forum_threads(board_id, hidden, pinned, last_post_at);
CREATE INDEX forum_threads_user ON forum_threads(user_id);

CREATE TABLE forum_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX forum_posts_thread ON forum_posts(thread_id, created_at);
CREATE INDEX forum_posts_user ON forum_posts(user_id);

CREATE TABLE forum_likes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (user_id, target_type, target_id)
);

CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  resolved_at TEXT
);
CREATE INDEX reports_status ON reports(status, created_at);

CREATE TABLE media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  alt TEXT NOT NULL DEFAULT '',
  data BLOB NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE api_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_used_at TEXT,
  revoked INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX activity_created ON activity_log(created_at);

CREATE TABLE autopilot_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued',
  article_id INTEGER,
  error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE daily_views (
  day TEXT NOT NULL,
  kind TEXT NOT NULL,
  slug TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, kind, slug)
);

CREATE TABLE contact_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL
)
`;

/**
 * V2: remembers content rows an admin deleted, so the next content sync does
 * not bring them back from their files.
 */
const V2 = `
CREATE TABLE deleted_seeds (
  table_name TEXT NOT NULL,
  slug TEXT NOT NULL,
  deleted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (table_name, slug)
)
`;

/** V3: what an autopilot run did (model, searches, notes for the editor), as JSON. */
const V3 = `
ALTER TABLE autopilot_topics ADD COLUMN report TEXT NOT NULL DEFAULT ''
`;

/** V4: who has been sent which newsletter issue, so a resumed send never emails anyone twice. */
const V4 = `
CREATE TABLE newsletter_sends (
  issue_id INTEGER NOT NULL,
  subscriber_id INTEGER NOT NULL,
  sent_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (issue_id, subscriber_id)
)
`;

/** V5: one-time password reset links. Only the hash of each token is stored. */
const V5 = `
CREATE TABLE password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
)
`;

export const MIGRATIONS: string[] = [V1, V2, V3, V4, V5];
