import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  ChipRow,
  CUSTOM,
  Field,
  FormInput,
  parseTagInput,
  toChipOptions,
} from '../components/FormControls';
import {
  DEFAULT_UNIT,
  MODULES,
  MODULE_LABELS,
  SUBTYPE_PRESETS,
  UNIT_PRESETS,
} from '../constants/modules';
import type { StudyModule } from '../constants/modules';
import { createStudyLog } from '../db/studyLogs';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddRecord'>;

type ParsedNumber = { value: number | null; invalid: boolean };

function parsePositiveNumber(input: string, integer: boolean): ParsedNumber {
  const trimmed = input.trim();
  if (!trimmed) {
    return { value: null, invalid: false };
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { value: null, invalid: true };
  }
  return { value: integer ? Math.round(parsed) : parsed, invalid: false };
}

export default function AddRecordScreen({ navigation }: Props) {
  const [module, setModule] = useState<StudyModule>('vocab');
  const [subtype, setSubtype] = useState('');
  const [customSubtype, setCustomSubtype] = useState('');
  const [content, setContent] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState(DEFAULT_UNIT.vocab);
  const [customUnit, setCustomUnit] = useState('');
  const [duration, setDuration] = useState('');
  const [correct, setCorrect] = useState('');
  const [total, setTotal] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  function selectModule(next: StudyModule) {
    setModule(next);
    setSubtype('');
    setCustomSubtype('');
    setUnit(DEFAULT_UNIT[next]);
    setCustomUnit('');
  }

  function resolveSubtype(): string | null {
    const value = (subtype === CUSTOM ? customSubtype : subtype).trim();
    return value.length > 0 ? value : null;
  }

  function resolveUnit(): string | null {
    const value = (unit === CUSTOM ? customUnit : unit).trim();
    return value.length > 0 ? value : null;
  }

  async function handleSave() {
    const amountValue = parsePositiveNumber(amount, false);
    const durationValue = parsePositiveNumber(duration, true);
    const correctValue = parsePositiveNumber(correct, true);
    const totalValue = parsePositiveNumber(total, true);

    if (amountValue.invalid || durationValue.invalid || correctValue.invalid || totalValue.invalid) {
      Alert.alert('无法保存', '数量、时长、正确数、总数需要填写正数');
      return;
    }
    if ((correctValue.value === null) !== (totalValue.value === null)) {
      Alert.alert('无法保存', '正确数与总数需要同时填写');
      return;
    }
    if (
      correctValue.value !== null &&
      totalValue.value !== null &&
      correctValue.value > totalValue.value
    ) {
      Alert.alert('无法保存', '正确数不能大于总数');
      return;
    }
    if (!content.trim() && amountValue.value === null && durationValue.value === null) {
      Alert.alert('无法保存', '内容、数量、时长至少填写一项');
      return;
    }

    setSaving(true);
    try {
      await createStudyLog({
        date: dayjs().format('YYYY-MM-DD'),
        module,
        subtype: resolveSubtype(),
        content: content.trim().length > 0 ? content.trim() : null,
        amount: amountValue.value,
        unit: resolveUnit(),
        durationMin: durationValue.value,
        correctCount: correctValue.value,
        totalCount: totalValue.value,
        tags: parseTagInput(tagInput),
        note: note.trim().length > 0 ? note.trim() : null,
      });
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
        <Field label="模块">
          <ChipRow
            options={MODULES.map((item) => ({ value: item, label: MODULE_LABELS[item] }))}
            value={module}
            onChange={(next) => selectModule(next as StudyModule)}
          />
        </Field>

        <Field label="子类">
          <ChipRow
            options={toChipOptions(SUBTYPE_PRESETS[module])}
            value={subtype}
            onChange={setSubtype}
          />
          {subtype === CUSTOM ? (
            <FormInput
              value={customSubtype}
              onChangeText={setCustomSubtype}
              placeholder="输入自定义子类"
            />
          ) : null}
        </Field>

        <Field label="内容">
          <FormInput
            value={content}
            onChangeText={setContent}
            placeholder="如：abandon / 2024年6月真题听力"
          />
        </Field>

        <Field label="数量与单位">
          <FormInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="数量，如 30"
          />
          <ChipRow options={toChipOptions(UNIT_PRESETS[module])} value={unit} onChange={setUnit} />
          {unit === CUSTOM ? (
            <FormInput
              value={customUnit}
              onChangeText={setCustomUnit}
              placeholder="输入自定义单位"
            />
          ) : null}
        </Field>

        <Field label="时长（分钟）">
          <FormInput
            value={duration}
            onChangeText={setDuration}
            keyboardType="number-pad"
            placeholder="如 25"
          />
        </Field>

        <Field label="正确数 / 总数">
          <View style={styles.row}>
            <FormInput
              style={styles.rowItem}
              value={correct}
              onChangeText={setCorrect}
              keyboardType="number-pad"
              placeholder="正确数"
            />
            <FormInput
              style={styles.rowItem}
              value={total}
              onChangeText={setTotal}
              keyboardType="number-pad"
              placeholder="总数"
            />
          </View>
        </Field>

        <Field label="标签">
          <FormInput
            value={tagInput}
            onChangeText={setTagInput}
            placeholder="用逗号分隔，如：高频词,易错"
          />
        </Field>

        <Field label="备注">
          <FormInput value={note} onChangeText={setNote} multiline placeholder="可选" />
        </Field>

        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={handleSave}
          style={({ pressed }) => [styles.save, pressed || saving ? styles.savePressed : null]}
        >
          <Text style={styles.saveLabel}>{saving ? '保存中…' : '保存记录'}</Text>
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
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowItem: {
    flex: 1,
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
