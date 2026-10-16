import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { useCallback, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MODULE_LABELS } from '../constants/modules';
import { getTodayProgress } from '../db/goals';
import type { GoalProgress } from '../db/goals';
import { getDueReviewCount } from '../db/reviews';
import { getStreakDays } from '../db/stats';
import { listStudyLogsByDate } from '../db/studyLogs';
import type { StudyLog } from '../db/studyLogs';
import type { RootStackParamList, RootTabParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, 'Today'>,
  NativeStackScreenProps<RootStackParamList>
>;

type TodayData = {
  streakDays: number;
  dueReviewCount: number;
  goals: GoalProgress[];
  logs: StudyLog[];
};

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function ProgressRow({ progress }: { progress: GoalProgress }) {
  return (
    <View style={styles.goalRow}>
      <View style={styles.goalHead}>
        <Text style={styles.goalLabel}>{progress.label}</Text>
        <Text style={styles.goalValue}>
          {formatNumber(progress.achieved)} / {formatNumber(progress.target)} {progress.unit}
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { flex: progress.ratio }]} />
        <View style={{ flex: Math.max(1 - progress.ratio, 0) }} />
      </View>
    </View>
  );
}

function LogCard({ log }: { log: StudyLog }) {
  const meta: string[] = [];
  if (log.amount !== null) {
    meta.push(`${formatNumber(log.amount)}${log.unit ?? ''}`);
  }
  if (log.durationMin !== null) {
    meta.push(`${log.durationMin} 分钟`);
  }
  if (log.correctCount !== null && log.totalCount !== null) {
    meta.push(`正确 ${log.correctCount}/${log.totalCount}`);
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>
          {MODULE_LABELS[log.module]}
          {log.subtype ? ` · ${log.subtype}` : ''}
        </Text>
        {meta.length > 0 ? <Text style={styles.cardMeta}>{meta.join(' · ')}</Text> : null}
      </View>
      {log.content ? <Text style={styles.cardContent}>{log.content}</Text> : null}
      {log.note ? <Text style={styles.cardNote}>{log.note}</Text> : null}
      {log.tags.length > 0 ? (
        <View style={styles.tagRow}>
          {log.tags.map((tag) => (
            <Text key={tag} style={styles.tag}>
              {tag}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function TodayScreen({ navigation }: Props) {
  const [data, setData] = useState<TodayData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openAdd = useCallback(() => {
    navigation.navigate('AddRecord');
  }, [navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={openAdd}
          style={styles.headerButton}
        >
          <Text style={styles.headerButtonLabel}>＋ 添加</Text>
        </Pressable>
      ),
    });
  }, [navigation, openAdd]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const load = async () => {
        try {
          const date = dayjs().format('YYYY-MM-DD');
          const [streakDays, dueReviewCount, goals, logs] = await Promise.all([
            getStreakDays(date),
            getDueReviewCount(date),
            getTodayProgress(date),
            listStudyLogsByDate(date),
          ]);
          if (!cancelled) {
            setData({ streakDays, dueReviewCount, goals, logs });
            setError(null);
          }
        } catch (caught) {
          if (!cancelled) {
            setError(caught instanceof Error ? caught.message : String(caught));
          }
        }
      };

      void load();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>今日数据加载失败</Text>
        <Text style={styles.errorDetail}>{error}</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Text style={styles.dateLine}>{dayjs().format('YYYY-MM-DD')}</Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{data.streakDays}</Text>
          <Text style={styles.summaryLabel}>连续打卡（天）</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{data.dueReviewCount}</Text>
          <Text style={styles.summaryLabel}>待复习</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>今日目标进度</Text>
      {data.goals.length > 0 ? (
        data.goals.map((progress) => <ProgressRow key={progress.key} progress={progress} />)
      ) : (
        <Text style={styles.emptyText}>未设置每日目标，可在「我的」中设置</Text>
      )}

      <Text style={styles.sectionTitle}>今日记录（{data.logs.length}）</Text>
      {data.logs.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>今天还没有记录</Text>
          <Pressable accessibilityRole="button" onPress={openAdd} style={styles.primaryButton}>
            <Text style={styles.primaryButtonLabel}>＋ 添加记录</Text>
          </Pressable>
        </View>
      ) : (
        data.logs.map((log) => <LogCard key={log.id} log={log} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#f5f6f8',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  dateLine: {
    marginBottom: 8,
    fontSize: 12,
    color: '#888888',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2f6fed',
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#666666',
  },
  sectionTitle: {
    marginBottom: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
  },
  goalRow: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  goalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  goalLabel: {
    fontSize: 14,
    color: '#333333',
  },
  goalValue: {
    fontSize: 13,
    color: '#666666',
  },
  barTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#eceef1',
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: '#2f6fed',
  },
  card: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
  },
  cardMeta: {
    marginLeft: 8,
    fontSize: 12,
    color: '#2f6fed',
  },
  cardContent: {
    marginTop: 6,
    fontSize: 14,
    color: '#333333',
  },
  cardNote: {
    marginTop: 4,
    fontSize: 12,
    color: '#888888',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 11,
    color: '#555555',
    backgroundColor: '#f0f1f3',
  },
  emptyBox: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  emptyText: {
    fontSize: 13,
    color: '#888888',
  },
  primaryButton: {
    marginTop: 12,
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2f6fed',
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  headerButtonLabel: {
    fontSize: 14,
    color: '#2f6fed',
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f5f6f8',
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#c0392b',
  },
  errorDetail: {
    marginTop: 8,
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
  },
});
