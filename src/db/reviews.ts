import { getDb } from './index';

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
