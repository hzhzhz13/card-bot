import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

const dbPath = join(dataDir, 'bot.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Create tables if they don't exist. Safe to call on every startup.
 */
export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,          -- Discord user ID
      username      TEXT,
      first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_drop_at  INTEGER,                   -- epoch ms of last /drop
      last_claim_at INTEGER                    -- epoch ms of last claim
    );

    CREATE TABLE IF NOT EXISTS user_cards (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     TEXT NOT NULL,
      card_id     TEXT NOT NULL,
      quantity    INTEGER NOT NULL DEFAULT 1,
      obtained_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, card_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_user_cards_user ON user_cards(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_cards_card ON user_cards(card_id);
  `);

  // Incremental columns (added after v1). ALTER TABLE ADD COLUMN is not
  // idempotent, so guard each against the current schema.
  addColumnIfMissing('users', 'coins', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('users', 'daily_streak', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('users', 'last_daily_at', 'INTEGER'); // epoch ms of last /daily
}

/** Add a column only if it doesn't already exist (safe on repeated startups). */
function addColumnIfMissing(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function closeDb() {
  db.close();
}
