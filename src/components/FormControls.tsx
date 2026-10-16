import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

export const CUSTOM = '自定义';

export type ChipOption = { value: string; label: string };

export function toChipOptions(values: string[]): ChipOption[] {
  return [...values.map((value) => ({ value, label: value })), { value: CUSTOM, label: CUSTOM }];
}

export function parseTagInput(input: string): string[] {
  const tags = input
    .split(/[,，、\s]+/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  return Array.from(new Set(tags));
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

export function ChipRow({
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

export function FormInput({ style, ...rest }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="#9aa0a6"
      {...rest}
      style={[styles.input, rest.multiline ? styles.multiline : null, style]}
    />
  );
}

const styles = StyleSheet.create({
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
});
