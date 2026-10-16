import { MODULE_LABELS } from '../constants/modules';
import type { StudyModule } from '../constants/modules';
import { getDb } from './index';

export type GoalModule = StudyModule | 'all';

export type DailyGoal = {
  id: number;
  module: GoalModule;
  targetAmount: number | null;
  unit: string | null;
  targetMinutes: number | null;
  isActive: boolean;
};

export type DailyGoalInput = {
  module: GoalModule;
  targetAmount: number | null;
  unit: string | null;
  targetMinutes: number | null;
};

export type GoalProgress = {
  key: string;
  label: string;
  unit: string;
  target: number;
  achieved: number;
  ratio: number;
};

type DailyGoalRow = {
  id: number;
  module: string;
  target_amount: number | null;
  unit: string | null;
  target_minutes: number | null;
  is_active: number;
};

type ModuleTotalsRow = {
  module: string;
  amount_sum: number | null;
  minutes_sum: number | null;
};

export const FALLBACK_GOAL: DailyGoal = {
  id: 0,
  module: 'all',
  targetAmount: null,
  unit: null,
  targetMinutes: 60,
  isActive: true,
};

function toDailyGoal(row: DailyGoalRow): DailyGoal {
  return {
    id: row.id,
    module: row.module as GoalModule,
    targetAmount: row.target_amount,
    unit: row.unit,
    targetMinutes: row.target_minutes,
    isActive: row.is_active === 1,
  };
}

export async function listDailyGoals(): Promise<DailyGoal[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DailyGoalRow>('SELECT * FROM daily_goals ORDER BY id', []);
  return rows.map(toDailyGoal);
}

export async function replaceDailyGoals(goals: DailyGoalInput[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM daily_goals', []);
    for (const goal of goals) {
      await db.runAsync(
        `INSERT INTO daily_goals (module, target_amount, unit, target_minutes, is_active)
         VALUES (?, ?, ?, ?, 1)`,
        [goal.module, goal.targetAmount, goal.unit, goal.targetMinutes],
      );
    }
  });
}

export async function getDailyGoals(): Promise<DailyGoal[]> {
  const goals = (await listDailyGoals()).filter((goal) => goal.isActive);
  return goals.length > 0 ? goals : [FALLBACK_GOAL];
}

function labelOf(module: GoalModule, kind: 'amount' | 'minutes'): string {
  if (module === 'all') {
    return kind === 'minutes' ? '学习时长' : '总学习量';
  }
  const base = MODULE_LABELS[module];
  return kind === 'minutes' ? `${base}时长` : `${base}数量`;
}

export async function getTodayProgress(date: string): Promise<GoalProgress[]> {
  const db = await getDb();
  const goals = await getDailyGoals();
  const rows = await db.getAllAsync<ModuleTotalsRow>(
    `SELECT module, SUM(amount) AS amount_sum, SUM(duration_min) AS minutes_sum
     FROM study_logs WHERE date = ? GROUP BY module`,
    [date],
  );

  const byModule = new Map<string, ModuleTotalsRow>();
  let totalAmount = 0;
  let totalMinutes = 0;
  for (const row of rows) {
    byModule.set(row.module, row);
    totalAmount += row.amount_sum ?? 0;
    totalMinutes += row.minutes_sum ?? 0;
  }

  const progress: GoalProgress[] = [];
  for (const goal of goals) {
    const achieved =
      goal.module === 'all'
        ? { amount: totalAmount, minutes: totalMinutes }
        : {
            amount: byModule.get(goal.module)?.amount_sum ?? 0,
            minutes: byModule.get(goal.module)?.minutes_sum ?? 0,
          };

    if (goal.targetAmount !== null && goal.targetAmount > 0) {
      progress.push({
        key: `${goal.id}-amount`,
        label: labelOf(goal.module, 'amount'),
        unit: goal.unit ?? '',
        target: goal.targetAmount,
        achieved: achieved.amount,
        ratio: Math.min(achieved.amount / goal.targetAmount, 1),
      });
    }

    if (goal.targetMinutes !== null && goal.targetMinutes > 0) {
      progress.push({
        key: `${goal.id}-minutes`,
        label: labelOf(goal.module, 'minutes'),
        unit: '分钟',
        target: goal.targetMinutes,
        achieved: achieved.minutes,
        ratio: Math.min(achieved.minutes / goal.targetMinutes, 1),
      });
    }
  }
  return progress;
}
