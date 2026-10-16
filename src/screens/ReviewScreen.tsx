import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { useCallback, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MODULE_LABELS } from '../constants/modules';
import { answerReviewItem, getDueReviewItems, REVIEW_INTERVALS } from '../db/reviews';
import type { ReviewItem, ReviewItemType, ReviewResult } from '../db/reviews';
import type { RootStackParamList, RootTabParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, 'Review'>,
  NativeStackScreenProps<RootStackParamList>
>;

const DATE_FORMAT = 'YYYY-MM-DD';

const TYPE_LABELS: Record<ReviewItemType, string> = {
  word: '生词',
  phrase: '短语',
  wrong_question: '错题',
};

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function ReviewScreen({ navigation }: Props) {
  const [queue, setQueue] = useState<ReviewItem[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [remembered, setRemembered] = useState(0);
  const [forgot, setForgot] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAdd = useCallback(() => {
    navigation.navigate('AddReviewItem');
  }, [navigation]);

  const refresh = useCallback(async () => {
    try {
      const items = await getDueReviewItems(dayjs().format(DATE_FORMAT));
      setQueue(items);
      setRevealed(false);
      setRemembered(0);
      setForgot(0);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={openAdd}
          style={styles.headerButton}
        >
          <Text style={styles.headerButtonLabel}>＋ 复习项</Text>
        </Pressable>
      ),
    });
  }, [navigation, openAdd]);

  const answer = async (result: ReviewResult) => {
    const current = queue?.[0];
    if (!current || busy) {
      return;
    }
    setBusy(true);
    try {
      await answerReviewItem(current.id, result, dayjs().format(DATE_FORMAT));
      if (result === 'remember') {
        setRemembered((value) => value + 1);
      } else {
        setForgot((value) => value + 1);
      }
      setQueue((prev) => (prev ? prev.slice(1) : prev));
      setRevealed(false);
    } catch (caught) {
      Alert.alert('操作失败', caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>复习数据加载失败</Text>
        <Text style={styles.errorDetail}>{error}</Text>
      </View>
    );
  }

  if (queue === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const reviewed = remembered + forgot;

  if (queue.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.doneTitle}>今日复习已完成</Text>
        <Text style={styles.doneDetail}>
          {reviewed > 0 ? `本次复习 ${reviewed} 张 · 记住 ${remembered} · 没记住 ${forgot}` : '当前没有到期的生词或错题'}
        </Text>
        <Pressable accessibilityRole="button" onPress={refresh} style={styles.primaryButton}>
          <Text style={styles.primaryButtonLabel}>刷新</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={openAdd} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonLabel}>＋ 添加复习项</Text>
        </Pressable>
      </View>
    );
  }

  const current = queue[0];

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>剩余 {queue.length} 张</Text>
        <Text style={styles.progressText}>
          记住 {remembered} · 没记住 {forgot}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => setRevealed(true)}
        style={styles.card}
      >
        <Text style={styles.cardType}>
          {TYPE_LABELS[current.type]}
          {current.module ? ` · ${MODULE_LABELS[current.module]}` : ''}
        </Text>
        <Text style={styles.front}>{current.front}</Text>

        {revealed ? (
          <View style={styles.detailBox}>
            {current.back ? <DetailLine label="释义" value={current.back} /> : null}
            {current.source ? <DetailLine label="来源" value={current.source} /> : null}
            {current.myAnswer ? <DetailLine label="我的答案" value={current.myAnswer} /> : null}
            {current.correctAnswer ? (
              <DetailLine label="正确答案" value={current.correctAnswer} />
            ) : null}
            {current.reason ? <DetailLine label="原因" value={current.reason} /> : null}
            {current.tags.length > 0 ? (
              <DetailLine label="标签" value={current.tags.join('、')} />
            ) : null}
            <Text style={styles.stageText}>
              当前阶段 {current.intervalIndex + 1} / {REVIEW_INTERVALS.length}
            </Text>
          </View>
        ) : (
          <Text style={styles.tapHint}>点击卡片查看答案</Text>
        )}
      </Pressable>

      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          disabled={!revealed || busy}
          onPress={() => answer('forgot')}
          style={[styles.actionButton, styles.forgotButton, !revealed || busy ? styles.disabled : null]}
        >
          <Text style={styles.forgotLabel}>没记住</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!revealed || busy}
          onPress={() => answer('remember')}
          style={[
            styles.actionButton,
            styles.rememberButton,
            !revealed || busy ? styles.disabled : null,
          ]}
        >
          <Text style={styles.rememberLabel}>记住了</Text>
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
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 13,
    color: '#666666',
  },
  card: {
    minHeight: 180,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    marginBottom: 20,
  },
  cardType: {
    fontSize: 12,
    color: '#2f6fed',
    marginBottom: 10,
  },
  front: {
    fontSize: 22,
    fontWeight: '600',
    color: '#222222',
  },
  tapHint: {
    marginTop: 20,
    fontSize: 13,
    color: '#9aa0a6',
  },
  detailBox: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eceef1',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    width: 72,
    fontSize: 13,
    color: '#888888',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
  },
  stageText: {
    marginTop: 4,
    fontSize: 12,
    color: '#9aa0a6',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotButton: {
    borderWidth: 1,
    borderColor: '#d8dbe0',
    backgroundColor: '#ffffff',
  },
  rememberButton: {
    backgroundColor: '#2f6fed',
  },
  disabled: {
    opacity: 0.4,
  },
  forgotLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  rememberLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
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
  primaryButton: {
    marginTop: 16,
    height: 40,
    paddingHorizontal: 24,
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
  secondaryButton: {
    marginTop: 10,
    height: 40,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d8dbe0',
    backgroundColor: '#ffffff',
  },
  secondaryButtonLabel: {
    color: '#2f6fed',
    fontSize: 14,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f5f6f8',
  },
  doneTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
  },
  doneDetail: {
    marginTop: 8,
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
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
