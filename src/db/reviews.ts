import dayjs from 'dayjs';

import type { StudyModule } from '../constants/modules';
import { getDb } from './index';

export const REVIEW_INTERVALS = [1, 3, 7, 14, 30];

const DATE_FORMAT = 'YYYY-MM-DD';

export type ReviewItemType = 'word' | 'phrase' | 'wrong_question';

export type ReviewStatus = 'new' | 'learning' | 'mastered';

export type ReviewResult = 'remember' | 'forgot';

export type ReviewItem = {
  id: number;
  type: ReviewItemType;
  module: StudyModule | null;
  front: string;
  back: string | null;
  source: string | null;
  myAnswer: string | null;
  correctAnswer: string | null;
  reason: string | null;
  tags: string[];
  status: ReviewStatus;
  intervalIndex: number;
  nextReviewAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReviewItemInput = {
  type: ReviewItemType;
  module: StudyModule | null;
  front: string;
  back: string | null;
  source: string | null;
  myAnswer: string | null;
  correctAnswer: string | null;
  reason: string | null;
  tags: string[];
};

type ReviewItemRow = {
  id: number;
  type: string;
  module: string | null;
  front: string;
  back: string | null;
  source: string | null;
  my_answer: string | null;
  correct_answer: string | null;
  reason: string | null;
  tags: string | null;
  status: string;
  interval_index: number;
  next_review_at: string | null;
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

function toReviewItem(row: ReviewItemRow): ReviewItem {
  return {
    id: row.id,
    type: row.type as ReviewItemType,
    module: row.module as StudyModule | null,
    front: row.front,
    back: row.back,
    source: row.source,
    myAnswer: row.my_answer,
    correctAnswer: row.correct_answer,
    reason: row.reason,
    tags: parseTags(row.tags),
    status: row.status as ReviewStatus,
    intervalIndex: row.interval_index,
    nextReviewAt: row.next_review_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getDueReviewCount(date: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total FROM review_items
     WHERE status <> 'mastered'
       AND (next_review_at IS NULL OR substr(next_review_at, 1, 10) <= ?)`,
    [date],
  );
  return row?.total ?? 0;
}

export async function getDueReviewItems(date: string): Promise<ReviewItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ReviewItemRow>(
    `SELECT * FROM review_items
     WHERE status <> 'mastered'
       AND (next_review_at IS NULL OR substr(next_review_at, 1, 10) <= ?)
     ORDER BY COALESCE(substr(next_review_at, 1, 10), '0000-01-01') ASC, id ASC`,
    [date],
  );
  return rows.map(toReviewItem);
}

export async function getReviewItem(id: number): Promise<ReviewItem | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ReviewItemRow>('SELECT * FROM review_items WHERE id = ?', [id]);
  return row ? toReviewItem(row) : null;
}

export async function createReviewItem(input: ReviewItemInput, date: string): Promise<number> {
  const db = await getDb();
  const timestamp = dayjs().toISOString();
  const nextReviewAt = dayjs(date).add(REVIEW_INTERVALS[0], 'day').format(DATE_FORMAT);
  const result = await db.runAsync(
    `INSERT INTO review_items
       (type, module, front, back, source, my_answer, correct_answer, reason, tags, status, interval_index, next_review_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', 0, ?, ?, ?)`,
    [
      input.type,
      input.module,
      input.front,
      input.back,
      input.source,
      input.myAnswer,
      input.correctAnswer,
      input.reason,
      JSON.stringify(input.tags),
      nextReviewAt,
      timestamp,
      timestamp,
    ],
  );
  return result.lastInsertRowId;
}

export async function answerReviewItem(
  id: number,
  result: ReviewResult,
  date: string,
): Promise<ReviewItem | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ReviewItemRow>('SELECT * FROM review_items WHERE id = ?', [id]);
  if (!row) {
    return null;
  }

  const stageCount = REVIEW_INTERVALS.length;
  let intervalIndex: number;
  let status: ReviewStatus;
  let nextReviewAt: string | null;

  if (result === 'remember') {
    intervalIndex = Math.min(row.interval_index + 1, stageCount);
    if (intervalIndex >= stageCount) {
      status = 'mastered';
      nextReviewAt = null;
    } else {
      status = 'learning';
      nextReviewAt = dayjs(date).add(REVIEW_INTERVALS[intervalIndex], 'day').format(DATE_FORMAT);
    }
  } else {
    intervalIndex = 0;
    status = 'learning';
    nextReviewAt = dayjs(date).add(REVIEW_INTERVALS[0], 'day').format(DATE_FORMAT);
  }

  const timestamp = dayjs().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE review_items SET status = ?, interval_index = ?, next_review_at = ?, updated_at = ? WHERE id = ?',
      [status, intervalIndex, nextReviewAt, timestamp, id],
    );
    await db.runAsync(
      'INSERT INTO review_logs (review_item_id, reviewed_at, result, next_review_at) VALUES (?, ?, ?, ?)',
      [id, timestamp, result, nextReviewAt],
    );
  });

  return getReviewItem(id);
}
