import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

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

const CUSTOM = '自定义';

type Props = NativeStackScreenProps<RootStackParamList, 'AddRecord'>;

type ChipOption = { value: string; label: string };

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

function parseTagInput(input: string): string[] {
  const tags = input
    .split(/[,，、\s]+/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  return Array.from(new Set(tags));
}

function toChipOptions(values: string[]): ChipOption[] {
  return [...values.map((value) => ({ value, label: value })), { value: CUSTOM, label: CUSTOM }];
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.chip, active ? styles.chipActive : null]}
          >
            <Text style={[styles.chipLabel, active ? styles.chipLabelActive : null]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
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

  const moduleOptions: ChipOption[] = MODULES.map((item) => ({
    value: item,
    label: MODULE_LABELS[item],
  }));

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="模块">
          <ChipRow
            options={moduleOptions}
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
            <TextInput
              style={styles.input}
              value={customSubtype}
              onChangeText={setCustomSubtype}
              placeholder="输入自定义子类"
              placeholderTextColor="#9aa0a6"
            />
          ) : null}
        </Field>

        <Field label="内容">
          <TextInput
            style={styles.input}
            value={content}
            onChangeText={setContent}
            placeholder="如：abandon / 2024年6月真题听力"
            placeholderTextColor="#9aa0a6"
          />
        </Field>

        <Field label="数量与单位">
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="数量，如 30"
            placeholderTextColor="#9aa0a6"
          />
          <ChipRow options={toChipOptions(UNIT_PRESETS[module])} value={unit} onChange={setUnit} />
          {unit === CUSTOM ? (
            <TextInput
              style={styles.input}
              value={customUnit}
              onChangeText={setCustomUnit}
              placeholder="输入自定义单位"
              placeholderTextColor="#9aa0a6"
            />
          ) : null}
        </Field>

        <Field label="时长（分钟）">
          <TextInput
            style={styles.input}
            value={duration}
            onChangeText={setDuration}
            keyboardType="number-pad"
            placeholder="如 25"
            placeholderTextColor="#9aa0a6"
          />
        </Field>

        <Field label="正确数 / 总数">
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.rowItem]}
              value={correct}
              onChangeText={setCorrect}
              keyboardType="number-pad"
              placeholder="正确数"
              placeholderTextColor="#9aa0a6"
            />
            <TextInput
              style={[styles.input, styles.rowItem]}
              value={total}
              onChangeText={setTotal}
              keyboardType="number-pad"
              placeholder="总数"
              placeholderTextColor="#9aa0a6"
            />
          </View>
        </Field>

        <Field label="标签">
          <TextInput
            style={styles.input}
            value={tagInput}
            onChangeText={setTagInput}
            placeholder="用逗号分隔，如：高频词,易错"
            placeholderTextColor="#9aa0a6"
          />
        </Field>

        <Field label="备注">
          <TextInput
            style={[styles.input, styles.multiline]}
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="可选"
            placeholderTextColor="#9aa0a6"
          />
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
  field: {
    marginBottom: 18,
  },
  fieldLabel: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d8dbe0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#222222',
    backgroundColor: '#ffffff',
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowItem: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d8dbe0',
    backgroundColor: '#f7f8fa',
  },
  chipActive: {
    borderColor: '#2f6fed',
    backgroundColor: '#e8f0fe',
  },
  chipLabel: {
    fontSize: 13,
    color: '#555555',
  },
  chipLabelActive: {
    color: '#2f6fed',
    fontWeight: '600',
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
