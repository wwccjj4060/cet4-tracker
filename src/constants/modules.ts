export const MODULES = ['vocab', 'listening', 'reading', 'writing', 'translation', 'mock'] as const;

export type StudyModule = (typeof MODULES)[number];

export const MODULE_LABELS: Record<StudyModule, string> = {
  vocab: '词汇',
  listening: '听力',
  reading: '阅读',
  writing: '写作',
  translation: '翻译',
  mock: '模考',
};

export const SUBTYPE_PRESETS: Record<StudyModule, string[]> = {
  vocab: ['单词', '短语', '例句'],
  listening: ['短对话', '长对话', '短文', '新闻', '听写'],
  reading: ['选词填空', '长篇阅读', '仔细阅读'],
  writing: ['应用文', '议论文', '图表作文'],
  translation: ['句子翻译', '段落翻译'],
  mock: ['真题模考', '模拟卷', '单项限时'],
};

export const UNIT_PRESETS: Record<StudyModule, string[]> = {
  vocab: ['个', '词', '组'],
  listening: ['篇', '题', '段'],
  reading: ['篇', '题'],
  writing: ['篇', '字'],
  translation: ['篇', '句', '字'],
  mock: ['套', '题'],
};

export const DEFAULT_UNIT: Record<StudyModule, string> = {
  vocab: '个',
  listening: '篇',
  reading: '篇',
  writing: '篇',
  translation: '篇',
  mock: '套',
};
