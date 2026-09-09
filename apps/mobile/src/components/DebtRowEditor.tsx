import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Card, Field, LinkText, Muted } from './ui';
import { DEBT_CATEGORIES } from '@/lib/types';
import { rowIssues, type DebtRow, useCalculatorStore } from '@/store/calculator';

/** One debt in the free calculator. Blank APR/minimum is allowed — the API estimates. */
export function DebtRowEditor({ row, index, canRemove }: { row: DebtRow; index: number; canRemove: boolean }) {
  const updateRow = useCalculatorStore((s) => s.updateRow);
  const removeRow = useCalculatorStore((s) => s.removeRow);
  const issues = rowIssues(row);

  const cycleCategory = () => {
    const next = DEBT_CATEGORIES[(DEBT_CATEGORIES.indexOf(row.category) + 1) % DEBT_CATEGORIES.length];
    updateRow(row.id, { category: next });
  };

  return (
    <Card className="mb-3">
      <View className="mb-2 flex-row items-center">
        <TextInput
          className="flex-1 font-bold text-[17px] text-ink"
          placeholder={`Debt ${index + 1}`}
          placeholderTextColor="#94a3b8"
          value={row.name}
          onChangeText={(name) => updateRow(row.id, { name })}
          maxLength={120}
          accessibilityLabel="Debt name"
        />
        <Pressable
          onPress={cycleCategory}
          accessibilityRole="button"
          accessibilityLabel={`Category ${row.category}, tap to change`}
          className="rounded-tag bg-slate-100 px-2 py-1 active:bg-slate-200"
        >
          <Text className="font-semibold text-[11px] text-muted">{row.category} ⟳</Text>
        </Pressable>
      </View>
      <Field
        label="Balance"
        prefix="$"
        keyboardType="decimal-pad"
        value={row.balance}
        onChangeText={(balance) => updateRow(row.id, { balance })}
        error={issues.balance}
        placeholder="0"
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field
            label="APR"
            suffix="%"
            keyboardType="decimal-pad"
            value={row.rate}
            onChangeText={(rate) => updateRow(row.id, { rate })}
            error={issues.rate}
            placeholder="est."
          />
        </View>
        <View className="flex-1">
          <Field
            label="Minimum / mo"
            prefix="$"
            keyboardType="decimal-pad"
            value={row.minimum}
            onChangeText={(minimum) => updateRow(row.id, { minimum })}
            error={issues.minimum}
            placeholder="est."
          />
        </View>
      </View>
      {canRemove ? (
        <View className="flex-row items-center justify-between">
          <Muted>Leave APR or minimum blank to use an estimate.</Muted>
          <LinkText title="Remove" onPress={() => removeRow(row.id)} />
        </View>
      ) : null}
    </Card>
  );
}
