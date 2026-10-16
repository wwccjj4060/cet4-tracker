export const DATABASE_NAME = 'cet4.db';

/**
 * date / created_at / updated_at / next_review_at / reviewed_at 均为 ISO 或
 * YYYY-MM-DD 字符串；tags 为 JSON 数组字符串，如 ["高频词"]。
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS study_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  module TEXT NOT NULL,
  subtype TEXT,
  content TEXT,
  amount REAL,
  unit TEXT,
  duration_min INTEGER,
  correct_count INTEGER,
  total_count INTEGER,
  tags TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS review_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  module TEXT,
  front TEXT NOT NULL,
  back TEXT,
  source TEXT,
  my_answer TEXT,
  correct_answer TEXT,
  reason TEXT,
  tags TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  interval_index INTEGER NOT NULL DEFAULT 0,
  next_review_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS review_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_item_id INTEGER NOT NULL,
  reviewed_at TEXT NOT NULL,
  result TEXT NOT NULL,
  next_review_at TEXT,
  FOREIGN KEY (review_item_id) REFERENCES review_items (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS daily_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module TEXT NOT NULL,
  target_amount REAL,
  unit TEXT,
  target_minutes INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_study_logs_date ON study_logs (date);
CREATE INDEX IF NOT EXISTS idx_study_logs_module ON study_logs (module);
CREATE INDEX IF NOT EXISTS idx_review_items_due ON review_items (status, next_review_at);
CREATE INDEX IF NOT EXISTS idx_review_logs_item ON review_logs (review_item_id);
`;
