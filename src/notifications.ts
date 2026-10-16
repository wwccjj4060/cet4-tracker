import dayjs from 'dayjs';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getDueReviewCount } from './db/reviews';
import { getSettings } from './db/settings';

const CHANNEL_ID = 'cet4-reminders';
const RECORD_ID = 'cet4-record-reminder';
const REVIEW_ID = 'cet4-review-reminder';
const DATE_FORMAT = 'YYYY-MM-DD';

export type ReminderSyncResult = {
  permissionGranted: boolean;
  record: boolean;
  review: boolean;
};

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: '学习提醒',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  if (!current.canAskAgain) {
    return false;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export function parseTime(time: string, fallbackHour: number): { hour: number; minute: number } {
  const [hourText, minuteText] = time.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return { hour: fallbackHour, minute: 0 };
  }
  return {
    hour: Math.min(Math.max(hour, 0), 23),
    minute: Math.min(Math.max(minute, 0), 59),
  };
}

async function cancel(requestId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(requestId);
  } catch {
    return;
  }
}

export async function syncReminders(): Promise<ReminderSyncResult> {
  const settings = await getSettings();
  const wanted = settings.recordReminder.enabled || settings.reviewReminder.enabled;

  await cancel(RECORD_ID);
  await cancel(REVIEW_ID);
  await ensureChannel();

  if (!wanted) {
    return { permissionGranted: true, record: false, review: false };
  }

  const permissionGranted = await ensurePermission();
  if (!permissionGranted) {
    return { permissionGranted: false, record: false, review: false };
  }

  let record = false;
  let review = false;

  if (settings.recordReminder.enabled) {
    const { hour, minute } = parseTime(settings.recordReminder.time, 20);
    await Notifications.scheduleNotificationAsync({
      identifier: RECORD_ID,
      content: {
        title: '今天还没记录吧？',
        body: '花 10 秒记一笔今天的学习内容，别断了连击。',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: CHANNEL_ID,
      },
    });
    record = true;
  }

  if (settings.reviewReminder.enabled) {
    const { hour, minute } = parseTime(settings.reviewReminder.time, 8);
    const due = await getDueReviewCount(dayjs().format(DATE_FORMAT));
    await Notifications.scheduleNotificationAsync({
      identifier: REVIEW_ID,
      content: {
        title: '复习提醒',
        body: due > 0 ? `今天有 ${due} 个待复习项，打开查看` : '今天有复习任务，打开查看',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: CHANNEL_ID,
      },
    });
    review = true;
  }

  return { permissionGranted: true, record, review };
}
