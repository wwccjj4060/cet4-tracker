import dayjs from 'dayjs';

import type { StudyModule } from '../constants/modules';
import { getDb } from './index';

export type StudyLogInput = {
  date: string;
  module: StudyModule;
  subtype: string | null;
  content: string | null;
  amount: number | null;
  unit: string | null;
  durationMin: number | null;
  correctCount: number | null;
  totalCount: number | null;
  tags: string[];
  note: string | null;
};

export type StudyLog = {
  id: number;
  date: string;
  module: StudyModule;
  subtype: string | null;
  content: string | null;
  amount: number | null;
  unit: string | null;
  durationMin: number | null;
  correctCount: number | null;
  totalCount: number | null;
  tags: string[];
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

type StudyLogRow = {
  id: number;
  date: string;
  module: string;
  subtype: string | null;
  content: string | null;
  amount: number | null;
  unit: string | null;
  duration_min: number | null;
  correct_count: number | null;
  total_count: number | null;
  tags: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

function parseTags(tags: string | null): string[] {
  if (!tags) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(tags);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

function toStudyLog(row: StudyLogRow): StudyLog {
  return {
    id: row.id,
    date: row.date,
    module: row.module as StudyModule,
    subtype: row.subtype,
    content: row.content,
    amount: row.amount,
    unit: row.unit,
    durationMin: row.duration_min,
    correctCount: row.correct_count,
    totalCount: row.total_count,
    tags: parseTags(row.tags),
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createStudyLog(input: StudyLogInput): Promise<number> {
  const db = await getDb();
  const timestamp = dayjs().toISOString();
  const result = await db.runAsync(
    `INSERT INTO study_logs
       (date, module, subtype, content, amount, unit, duration_min, correct_count, total_count, tags, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.date,
      input.module,
      input.subtype,
      input.content,
      input.amount,
      input.unit,
      input.durationMin,
      input.correctCount,
      input.totalCount,
      JSON.stringify(input.tags),
      input.note,
      timestamp,
      timestamp,
    ],
  );
  return result.lastInsertRowId;
}

export async function listStudyLogsByDate(date: string): Promise<StudyLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<StudyLogRow>(
    'SELECT * FROM study_logs WHERE date = ? ORDER BY id DESC',
    [date],
  );
  return rows.map(toStudyLog);
}
