import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';

import { MODULE_LABELS } from '../constants/modules';
import {
  getDailyAccuracy,
  getDailyMinutes,
  getModuleMinutes,
  getStreakDays,
  getTotalVocabAmount,
  getWeekMinutes,
} from '../db/stats';
import type { DailyAccuracy, DailyMinutes, ModuleMinutes } from '../db/stats';
import type { RootTabParamList } from '../navigation/types';

type Props = BottomTabScreenProps<RootTabParamList, 'Stats'>;

type StatsData = {
  streakDays: number;
  weekMinutes: number;
  moduleMinutes: ModuleMinutes[];
  dailyMinutes: DailyMinutes[];
  dailyAccuracy: DailyAccuracy[];
  vocabAmount: number;
};

const minutesChartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(47, 111, 237, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
  barPercentage: 0.6,
  barRadius: 4,
  propsForBackgroundLines: { stroke: '#eceef1' },
};

const accuracyChartConfig = {
  ...minutesChartConfig,
  color: (opacity = 1) => `rgba(26, 159, 90, ${opacity})`,
  fillShadowGradientFrom: '#1a9f5a',
  fillShadowGradientTo: '#ffffff',
  fillShadowGradientFromOpacity: 0.25,
  fillShadowGradientToOpacity: 0,
};

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function StatsScreen(_props: Props) {
  const { width } = useWindowDimensions();
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const load = async () => {
        try {
          const today = dayjs().format('YYYY-MM-DD');
          const [streakDays, weekMinutes, moduleMinutes, dailyMinutes, dailyAccuracy, vocabAmount] =
            await Promise.all([
              getStreakDays(today),
              getWeekMinutes(today),
              getModuleMinutes(today),
              getDailyMinutes(today, 7),
              getDailyAccuracy(today, 7),
              getTotalVocabAmount(),
            ]);
          if (!cancelled) {
            setData({
              streakDays,
              weekMinutes,
              moduleMinutes,
              dailyMinutes,
              dailyAccuracy,
              vocabAmount,
            });
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
        <Text style={styles.errorTitle}>统计数据加载失败</Text>
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

  const chartWidth = Math.max(width - 56, 240);
  const totalModuleMinutes = data.moduleMinutes.reduce((sum, item) => sum + item.minutes, 0);
  const moduleMinutesTotal = Math.max(totalModuleMinutes, 1);
  const hasDailyMinutes = data.dailyMinutes.some((item) => item.minutes > 0);
  const accuracyTotal = data.dailyAccuracy.reduce((sum, item) => sum + item.total, 0);
  const accuracyCorrect = data.dailyAccuracy.reduce((sum, item) => sum + item.correct, 0);
  const overallRate =
    accuracyTotal > 0 ? Math.round((accuracyCorrect / accuracyTotal) * 1000) / 10 : null;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{data.streakDays}</Text>
          <Text style={styles.summaryLabel}>连续打卡（天）</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatNumber(data.weekMinutes)}</Text>
          <Text style={styles.summaryLabel}>本周时长（分钟）</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatNumber(data.vocabAmount)}</Text>
          <Text style={styles.summaryLabel}>累计单词量</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>模块时间分布（本周）</Text>
      <View style={styles.card}>
        {data.moduleMinutes.length === 0 ? (
          <Text style={styles.emptyText}>本周还没有时长记录</Text>
        ) : (
          data.moduleMinutes.map((item) => (
            <View key={item.module} style={styles.distRow}>
              <View style={styles.distHead}>
                <Text style={styles.distLabel}>{MODULE_LABELS[item.module]}</Text>
                <Text style={styles.distValue}>
                  {formatNumber(item.minutes)} 分钟 ·{' '}
                  {Math.round((item.minutes / moduleMinutesTotal) * 100)}%
                </Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { flex: item.minutes / moduleMinutesTotal }]} />
                <View style={{ flex: 1 - item.minutes / moduleMinutesTotal }} />
              </View>
            </View>
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>最近 7 天每日时长（分钟）</Text>
      <View style={styles.card}>
        {hasDailyMinutes ? (
          <BarChart
            data={{
              labels: data.dailyMinutes.map((item) => item.label),
              datasets: [{ data: data.dailyMinutes.map((item) => item.minutes) }],
            }}
            width={chartWidth}
            height={200}
            chartConfig={minutesChartConfig}
            fromZero
            segments={4}
            showValuesOnTopOfBars
            withInnerLines={false}
            yAxisLabel=""
            yAxisSuffix=""
            style={styles.chart}
          />
        ) : (
          <Text style={styles.emptyText}>最近 7 天还没有时长记录</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>最近 7 天正确率</Text>
      <View style={styles.card}>
        <Text style={styles.summaryLine}>
          {overallRate === null
            ? '最近 7 天还没有做题记录'
            : `整体正确率 ${formatNumber(overallRate)}%（共 ${accuracyTotal} 题）`}
        </Text>
        {data.dailyAccuracy.length >= 2 ? (
          <LineChart
            data={{
              labels: data.dailyAccuracy.map((item) => item.label),
              datasets: [{ data: data.dailyAccuracy.map((item) => item.rate), strokeWidth: 2 }],
            }}
            width={chartWidth}
            height={200}
            chartConfig={accuracyChartConfig}
            fromZero
            segments={4}
            bezier
            withInnerLines={false}
            yAxisLabel=""
            yAxisSuffix="%"
            style={styles.chart}
          />
        ) : data.dailyAccuracy.length === 1 ? (
          <Text style={styles.emptyText}>最近 7 天只有 1 天做题数据，暂不绘制趋势</Text>
        ) : null}
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
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
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
    fontSize: 22,
    fontWeight: '700',
    color: '#2f6fed',
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
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
  chart: {
    marginLeft: -8,
  },
  distRow: {
    marginBottom: 12,
  },
  distHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  distLabel: {
    fontSize: 13,
    color: '#333333',
  },
  distValue: {
    fontSize: 12,
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
  summaryLine: {
    marginBottom: 8,
    fontSize: 13,
    color: '#333333',
  },
  emptyText: {
    fontSize: 13,
    color: '#888888',
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
