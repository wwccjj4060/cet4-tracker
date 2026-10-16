import dayjs from 'dayjs';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { collectBackup, studyLogsToCsv } from './db/backup';

function stamp(): string {
  return dayjs().format('YYYYMMDD-HHmmss');
}

async function writeAndShare(
  fileName: string,
  content: string,
  mimeType: string,
  dialogTitle: string,
): Promise<string> {
  const file = new File(Paths.cache, fileName);
  if (file.exists) {
    file.delete();
  }
  file.create();
  await file.write(content);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('当前设备不支持系统分享');
  }
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
  return fileName;
}

export async function exportJson(): Promise<string> {
  const payload = await collectBackup();
  return writeAndShare(
    `cet4-tracker-${stamp()}.json`,
    JSON.stringify(payload, null, 2),
    'application/json',
    '导出 JSON 备份',
  );
}

export async function exportCsv(): Promise<string> {
  const payload = await collectBackup();
  return writeAndShare(
    `cet4-study-logs-${stamp()}.csv`,
    studyLogsToCsv(payload.tables.study_logs),
    'text/csv',
    '导出学习记录 CSV',
  );
}
