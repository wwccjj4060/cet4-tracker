import dayjs from 'dayjs';

import { getDb } from './index';

export type BackupTables = {
  study_logs: Record<string, unknown>[];
  review_items: Record<string, unknown>[];
  review_logs: Record<string, unknown>[];
  daily_goals: Record<string, unknown>[];
  app_settings: Record<string, unknown>[];
};

export type BackupPayload = {
  app: string;
  schemaVersion: number;
  exportedAt: string;
  tables: BackupTables;
};

const STUDY_LOG_COLUMNS = [
  'id',
  'date',
  'module',
  'subtype',
  'content',
  'amount',
  'unit',
  'duration_min',
  'correct_count',
  'total_count',
  'tags',
  'note',
  'created_at',
  'updated_at',
];

export async function collectBackup(): Promise<BackupPayload> {
  const db = await getDb();
  const [studyLogs, reviewItems, reviewLogs, dailyGoals, appSettings] = await Promise.all([
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM study_logs ORDER BY id', []),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM review_items ORDER BY id', []),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM review_logs ORDER BY id', []),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM daily_goals ORDER BY id', []),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM app_settings ORDER BY key', []),
  ]);

  return {
    app: '四级学习记录器',
    schemaVersion: 1,
    exportedAt: dayjs().toISOString(),
    tables: {
      study_logs: studyLogs,
      review_items: reviewItems,
      review_logs: reviewLogs,
      daily_goals: dailyGoals,
      app_settings: appSettings,
    },
  };
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => escapeCsv(row[column])).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function studyLogsToCsv(rows: Record<string, unknown>[]): string {
  return toCsv(STUDY_LOG_COLUMNS, rows);
}
