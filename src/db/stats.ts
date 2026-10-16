import dayjs from 'dayjs';

import type { StudyModule } from '../constants/modules';
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

export type ModuleMinutes = {
  module: StudyModule;
  minutes: number;
};

export type DailyMinutes = {
  date: string;
  label: string;
  minutes: number;
};

export type DailyAccuracy = {
  date: string;
  label: string;
  correct: number;
  total: number;
  rate: number;
};

const DATE_FORMAT = 'YYYY-MM-DD';

function weekRange(date: string): { start: string; end: string } {
  const day = dayjs(date);
  const offset = (day.day() + 6) % 7;
  const start = day.subtract(offset, 'day');
  return { start: start.format(DATE_FORMAT), end: start.add(6, 'day').format(DATE_FORMAT) };
}

function recentDates(date: string, days: number): string[] {
  const end = dayjs(date);
  const dates: string[] = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    dates.push(end.subtract(index, 'day').format(DATE_FORMAT));
  }
  return dates;
}

export async function getWeekMinutes(date: string): Promise<number> {
  const db = await getDb();
  const { start, end } = weekRange(date);
  const row = await db.getFirstAsync<{ total: number | null }>(
    'SELECT SUM(duration_min) AS total FROM study_logs WHERE date >= ? AND date <= ?',
    [start, end],
  );
  return row?.total ?? 0;
}

export async function getModuleMinutes(date: string): Promise<ModuleMinutes[]> {
  const db = await getDb();
  const { start, end } = weekRange(date);
  const rows = await db.getAllAsync<{ module: string; total: number | null }>(
    `SELECT module, SUM(duration_min) AS total FROM study_logs
     WHERE date >= ? AND date <= ? GROUP BY module ORDER BY total DESC`,
    [start, end],
  );
  return rows
    .map((row) => ({ module: row.module as StudyModule, minutes: row.total ?? 0 }))
    .filter((item) => item.minutes > 0);
}

export async function getDailyMinutes(date: string, days = 7): Promise<DailyMinutes[]> {
  const db = await getDb();
  const dates = recentDates(date, days);
  const rows = await db.getAllAsync<{ date: string; total: number | null }>(
    `SELECT date, SUM(duration_min) AS total FROM study_logs
     WHERE date >= ? AND date <= ? GROUP BY date`,
    [dates[0], dates[dates.length - 1]],
  );
  const byDate = new Map(rows.map((row) => [row.date, row.total ?? 0]));
  return dates.map((item) => ({
    date: item,
    label: dayjs(item).format('D'),
    minutes: byDate.get(item) ?? 0,
  }));
}

export async function getDailyAccuracy(date: string, days = 7): Promise<DailyAccuracy[]> {
  const db = await getDb();
  const dates = recentDates(date, days);
  const rows = await db.getAllAsync<{
    date: string;
    correct_sum: number | null;
    total_sum: number | null;
  }>(
    `SELECT date, SUM(correct_count) AS correct_sum, SUM(total_count) AS total_sum
     FROM study_logs
     WHERE date >= ? AND date <= ?
       AND correct_count IS NOT NULL AND total_count IS NOT NULL AND total_count > 0
     GROUP BY date ORDER BY date`,
    [dates[0], dates[dates.length - 1]],
  );
  return rows.map((row) => {
    const correct = row.correct_sum ?? 0;
    const total = row.total_sum ?? 0;
    return {
      date: row.date,
      label: dayjs(row.date).format('D'),
      correct,
      total,
      rate: total > 0 ? Math.round((correct / total) * 1000) / 10 : 0,
    };
  });
}

export async function getTotalVocabAmount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number | null }>(
    "SELECT SUM(amount) AS total FROM study_logs WHERE module = 'vocab'",
    [],
  );
  return row?.total ?? 0;
}
