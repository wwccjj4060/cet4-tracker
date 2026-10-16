import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { ChipRow, Field, FormInput, parseTagInput } from '../components/FormControls';
import { MODULES, MODULE_LABELS } from '../constants/modules';
import type { StudyModule } from '../constants/modules';
import { createReviewItem } from '../db/reviews';
import type { ReviewItemType } from '../db/reviews';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddReviewItem'>;

const NONE = '不指定';

const TYPE_OPTIONS = [
  { value: 'word', label: '生词' },
  { value: 'phrase', label: '短语' },
  { value: 'wrong_question', label: '错题' },
];

const MODULE_OPTIONS = [
  { value: NONE, label: NONE },
  ...MODULES.map((item) => ({ value: item as string, label: MODULE_LABELS[item] })),
];

export default function AddReviewItemScreen({ navigation }: Props) {
  const [type, setType] = useState<ReviewItemType>('word');
  const [module, setModule] = useState<string>(NONE);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [source, setSource] = useState('');
  const [myAnswer, setMyAnswer] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [reason, setReason] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!front.trim()) {
      Alert.alert('无法保存', '正面内容不能为空');
      return;
    }

    setSaving(true);
    try {
      await createReviewItem(
        {
          type,
          module: module === NONE ? null : (module as StudyModule),
          front: front.trim(),
          back: back.trim() || null,
          source: source.trim() || null,
          myAnswer: myAnswer.trim() || null,
          correctAnswer: correctAnswer.trim() || null,
          reason: reason.trim() || null,
          tags: parseTagInput(tagInput),
        },
        dayjs().format('YYYY-MM-DD'),
      );
      navigation.goBack();
    } catch (error) {
      Alert.alert('保存失败', error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="类型">
          <ChipRow options={TYPE_OPTIONS} value={type} onChange={(next) => setType(next as ReviewItemType)} />
        </Field>

        <Field label="模块">
          <ChipRow options={MODULE_OPTIONS} value={module} onChange={setModule} />
        </Field>

        <Field label="正面">
          <FormInput value={front} onChangeText={setFront} placeholder="单词 / 短语 / 题干" />
        </Field>

        <Field label="释义 / 答案">
          <FormInput value={back} onChangeText={setBack} placeholder="可选" />
        </Field>

        <Field label="来源">
          <FormInput value={source} onChangeText={setSource} placeholder="可选，如 2024年6月真题" />
        </Field>

        <Field label="我的答案">
          <FormInput value={myAnswer} onChangeText={setMyAnswer} placeholder="可选" />
        </Field>

        <Field label="正确答案">
          <FormInput value={correctAnswer} onChangeText={setCorrectAnswer} placeholder="可选" />
        </Field>

        <Field label="原因">
          <FormInput value={reason} onChangeText={setReason} multiline placeholder="可选" />
        </Field>

        <Field label="标签">
          <FormInput
            value={tagInput}
            onChangeText={setTagInput}
            placeholder="用逗号分隔，如：高频词,易错"
          />
        </Field>

        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={handleSave}
          style={({ pressed }) => [styles.save, pressed || saving ? styles.savePressed : null]}
        >
          <Text style={styles.saveLabel}>{saving ? '保存中…' : '保存复习项'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  save: {
    marginTop: 8,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2f6fed',
  },
  savePressed: {
    backgroundColor: '#2559c4',
  },
  saveLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
