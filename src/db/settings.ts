import { getDb } from './index';

export type ReminderConfig = {
  enabled: boolean;
  time: string;
};

export type AppSettings = {
  recordReminder: ReminderConfig;
  reviewReminder: ReminderConfig;
};

export const DEFAULT_RECORD_TIME = '20:00';
export const DEFAULT_REVIEW_TIME = '08:00';

const RECORD_ENABLED_KEY = 'reminder_record_enabled';
const RECORD_TIME_KEY = 'reminder_record_time';
const REVIEW_ENABLED_KEY = 'reminder_review_enabled';
const REVIEW_TIME_KEY = 'reminder_review_time';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTime(time: string): boolean {
  return TIME_PATTERN.test(time.trim());
}

async function readAll(): Promise<Map<string, string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string | null }>(
    'SELECT key, value FROM app_settings',
    [],
  );
  return new Map(rows.map((row) => [row.key, row.value ?? '']));
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

export async function getSettings(): Promise<AppSettings> {
  const values = await readAll();
  const recordTime = values.get(RECORD_TIME_KEY);
  const reviewTime = values.get(REVIEW_TIME_KEY);

  return {
    recordReminder: {
      enabled: values.get(RECORD_ENABLED_KEY) !== 'false',
      time: recordTime && isValidTime(recordTime) ? recordTime : DEFAULT_RECORD_TIME,
    },
    reviewReminder: {
      enabled: values.get(REVIEW_ENABLED_KEY) !== 'false',
      time: reviewTime && isValidTime(reviewTime) ? reviewTime : DEFAULT_REVIEW_TIME,
    },
  };
}

export async function saveReminder(
  kind: 'record' | 'review',
  config: ReminderConfig,
): Promise<void> {
  const enabledKey = kind === 'record' ? RECORD_ENABLED_KEY : REVIEW_ENABLED_KEY;
  const timeKey = kind === 'record' ? RECORD_TIME_KEY : REVIEW_TIME_KEY;
  await saveSetting(enabledKey, config.enabled ? 'true' : 'false');
  await saveSetting(timeKey, config.time.trim());
}
