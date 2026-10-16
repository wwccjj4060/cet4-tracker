import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import appJson from '../../app.json';
import { Field, FormInput } from '../components/FormControls';
import { clearAllData } from '../db';
import { listDailyGoals, replaceDailyGoals } from '../db/goals';
import type { DailyGoalInput } from '../db/goals';
import {
  DEFAULT_RECORD_TIME,
  DEFAULT_REVIEW_TIME,
  getSettings,
  isValidTime,
  saveReminder,
} from '../db/settings';
import { exportCsv, exportJson } from '../export';
import { syncReminders } from '../notifications';
import type { RootTabParamList } from '../navigation/types';

type Props = BottomTabScreenProps<RootTabParamList, 'Profile'>;

type ParsedTarget = { value: number | null; invalid: boolean };

function parseTarget(input: string): ParsedTarget {
  const trimmed = input.trim();
  if (!trimmed) {
    return { value: null, invalid: false };
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { value: null, invalid: true };
  }
  return { value: Math.round(parsed), invalid: false };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function ProfileScreen(_props: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordEnabled, setRecordEnabled] = useState(true);
  const [recordTime, setRecordTime] = useState(DEFAULT_RECORD_TIME);
  const [reviewEnabled, setReviewEnabled] = useState(true);
  const [reviewTime, setReviewTime] = useState(DEFAULT_REVIEW_TIME);
  const [minutesTarget, setMinutesTarget] = useState('');
  const [vocabTarget, setVocabTarget] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [settings, goals] = await Promise.all([getSettings(), listDailyGoals()]);
      setRecordEnabled(settings.recordReminder.enabled);
      setRecordTime(settings.recordReminder.time);
      setReviewEnabled(settings.reviewReminder.enabled);
      setReviewTime(settings.reviewReminder.time);

      const minutesGoal = goals.find((goal) => goal.module === 'all');
      const vocabGoal = goals.find((goal) => goal.module === 'vocab');
      setMinutesTarget(minutesGoal?.targetMinutes ? String(minutesGoal.targetMinutes) : '');
      setVocabTarget(vocabGoal?.targetAmount ? String(vocabGoal.targetAmount) : '');
      setError(null);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const saveGoals = async () => {
    const minutes = parseTarget(minutesTarget);
    const vocab = parseTarget(vocabTarget);
    if (minutes.invalid || vocab.invalid) {
      Alert.alert('无法保存', '目标需要填写正数，留空表示不设置');
      return;
    }

    const goals: DailyGoalInput[] = [];
    if (minutes.value !== null) {
      goals.push({ module: 'all', targetAmount: null, unit: null, targetMinutes: minutes.value });
    }
    if (vocab.value !== null) {
      goals.push({
        module: 'vocab',
        targetAmount: vocab.value,
        unit: '个',
        targetMinutes: null,
      });
    }

    setBusy(true);
    try {
      await replaceDailyGoals(goals);
      Alert.alert('已保存', '每日目标已更新，可在「今日」查看进度');
    } catch (caught) {
      Alert.alert('保存失败', messageOf(caught));
    } finally {
      setBusy(false);
    }
  };

  const saveReminders = async () => {
    if (!isValidTime(recordTime) || !isValidTime(reviewTime)) {
      Alert.alert('无法保存', '时间格式为 HH:mm，例如 20:00');
      return;
    }

    setBusy(true);
    try {
      await saveReminder('record', { enabled: recordEnabled, time: recordTime });
      await saveReminder('review', { enabled: reviewEnabled, time: reviewTime });
      const result = await syncReminders();
      if ((recordEnabled || reviewEnabled) && !result.permissionGranted) {
        Alert.alert('提醒未生效', '系统没有授予通知权限，请在系统设置里允许本应用发送通知');
      } else {
        Alert.alert(
          '已保存',
          `记录提醒 ${result.record ? '开启' : '关闭'} · 复习提醒 ${result.review ? '开启' : '关闭'}`,
        );
      }
    } catch (caught) {
      Alert.alert('保存失败', messageOf(caught));
    } finally {
      setBusy(false);
    }
  };

  const runExport = async (kind: 'json' | 'csv') => {
    setBusy(true);
    try {
      if (kind === 'json') {
        await exportJson();
      } else {
        await exportCsv();
      }
    } catch (caught) {
      Alert.alert('导出失败', messageOf(caught));
    } finally {
      setBusy(false);
    }
  };

  const confirmClear = async () => {
    setBusy(true);
    try {
      await clearAllData();
      await refresh();
      Alert.alert('已清空', '学习记录、复习项与每日目标已删除');
    } catch (caught) {
      Alert.alert('清空失败', messageOf(caught));
    } finally {
      setBusy(false);
    }
  };

  const handleClear = () => {
    Alert.alert(
      '清空数据',
      '将删除全部学习记录、复习项与每日目标，提醒和导出设置会保留。此操作无法撤销。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认清空',
          style: 'destructive',
          onPress: () => {
            void confirmClear();
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>设置加载失败</Text>
        <Text style={styles.errorDetail}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>每日目标</Text>
      <View style={styles.card}>
        <Field label="每日学习时长（分钟）">
          <FormInput
            value={minutesTarget}
            onChangeText={setMinutesTarget}
            keyboardType="number-pad"
            placeholder="留空则默认 60"
          />
        </Field>
        <Field label="每日单词量（个）">
          <FormInput
            value={vocabTarget}
            onChangeText={setVocabTarget}
            keyboardType="number-pad"
            placeholder="留空表示不设置"
          />
        </Field>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={saveGoals}
          style={({ pressed }) => [styles.primaryButton, pressed || busy ? styles.pressed : null]}
        >
          <Text style={styles.primaryButtonLabel}>保存目标</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>提醒</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>记录提醒</Text>
          <Switch
            value={recordEnabled}
            onValueChange={setRecordEnabled}
            trackColor={{ true: '#2f6fed' }}
          />
        </View>
        <FormInput
          value={recordTime}
          onChangeText={setRecordTime}
          keyboardType="numbers-and-punctuation"
          placeholder={`默认 ${DEFAULT_RECORD_TIME}`}
        />

        <View style={[styles.switchRow, styles.switchRowSpaced]}>
          <Text style={styles.switchLabel}>复习提醒</Text>
          <Switch
            value={reviewEnabled}
            onValueChange={setReviewEnabled}
            trackColor={{ true: '#2f6fed' }}
          />
        </View>
        <FormInput
          value={reviewTime}
          onChangeText={setReviewTime}
          keyboardType="numbers-and-punctuation"
          placeholder={`默认 ${DEFAULT_REVIEW_TIME}`}
        />

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={saveReminders}
          style={({ pressed }) => [styles.primaryButton, pressed || busy ? styles.pressed : null]}
        >
          <Text style={styles.primaryButtonLabel}>保存提醒</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>导出</Text>
      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            void runExport('json');
          }}
          style={({ pressed }) => [styles.secondaryButton, pressed || busy ? styles.pressed : null]}
        >
          <Text style={styles.secondaryButtonLabel}>导出 JSON（全部数据）</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            void runExport('csv');
          }}
          style={({ pressed }) => [
            styles.secondaryButton,
            styles.secondaryButtonSpaced,
            pressed || busy ? styles.pressed : null,
          ]}
        >
          <Text style={styles.secondaryButtonLabel}>导出 CSV（学习记录）</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>关于</Text>
      <View style={styles.card}>
        <Text style={styles.aboutTitle}>{appJson.expo.name}</Text>
        <Text style={styles.aboutText}>版本 {appJson.expo.version}</Text>
        <Text style={styles.aboutText}>包名 {appJson.expo.android.package}</Text>
        <Text style={styles.aboutText}>数据只保存在本机 SQLite，离线可用，无需登录。</Text>
        <Text style={styles.aboutText}>间隔复习：1 / 3 / 7 / 14 / 30 天，五阶后标记为已掌握。</Text>
      </View>

      <Text style={styles.sectionTitle}>危险操作</Text>
      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={handleClear}
          style={({ pressed }) => [styles.dangerButton, pressed || busy ? styles.pressed : null]}
        >
          <Text style={styles.dangerButtonLabel}>清空数据</Text>
        </Pressable>
      </View>
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
  sectionTitle: {
    marginBottom: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
  },
  card: {
    marginBottom: 20,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  switchRowSpaced: {
    marginTop: 10,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
  },
  primaryButton: {
    marginTop: 4,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2f6fed',
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d8dbe0',
    backgroundColor: '#ffffff',
  },
  secondaryButtonSpaced: {
    marginTop: 10,
  },
  secondaryButtonLabel: {
    color: '#2f6fed',
    fontSize: 15,
    fontWeight: '600',
  },
  dangerButton: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0b4ae',
    backgroundColor: '#fdf3f2',
  },
  dangerButtonLabel: {
    color: '#c0392b',
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
  aboutTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 6,
  },
  aboutText: {
    marginTop: 4,
    fontSize: 13,
    color: '#666666',
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
