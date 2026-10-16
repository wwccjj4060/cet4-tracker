import dayjs from 'dayjs';

import { getDb } from './index';

export async function getStreakDays(date: string): Promise<number> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ date: string }>(
    'SELECT DISTINCT date FROM study_logs ORDER BY date DESC',
    [],
  );
  if (rows.length === 0) {
    return 0;
  }

  const dates = new Set(rows.map((row) => row.date));
  const today = dayjs(date);
  let cursor = today;
  if (!dates.has(cursor.format('YYYY-MM-DD'))) {
    cursor = today.subtract(1, 'day');
    if (!dates.has(cursor.format('YYYY-MM-DD'))) {
      return 0;
    }
  }

  let streak = 0;
  while (dates.has(cursor.format('YYYY-MM-DD'))) {
    streak += 1;
    cursor = cursor.subtract(1, 'day');
  }
  return streak;
}
