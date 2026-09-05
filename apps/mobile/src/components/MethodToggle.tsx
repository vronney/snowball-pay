import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Muted, Num } from './ui';
import { money, monthYear } from '@/lib/format';
import type { CalculateResponse, PayoffMethod } from '@/lib/types';

interface Option {
  method: PayoffMethod;
  title: string;
  blurb: string;
  plan?: CalculateResponse;
}

/**
 * Snowball vs. avalanche with each option's REAL date and interest, so the
 * choice is an informed one (and the IKEA-effect moment before any signup).
 */
export function MethodToggle({
  value,
  onChange,
  options,
}: {
  value: PayoffMethod;
  onChange: (method: PayoffMethod) => void;
  options: Option[];
}) {
  return (
    <View className="gap-3">
      {options.map((opt) => {
        const active = value === opt.method;
        return (
          <Pressable
            key={opt.method}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.method)}
            className={`rounded-card border-2 bg-surface p-4 ${active ? 'border-primary' : 'border-line'}`}
          >
            <View className="flex-row items-center justify-between">
              <Text className={`font-bold text-[16px] ${active ? 'text-primary' : 'text-ink'}`}>{opt.title}</Text>
              {opt.plan ? (
                <Num className="text-[15px]">{monthYear(opt.plan.result.debtFreeDate)}</Num>
              ) : null}
            </View>
            <Muted className="mt-1">{opt.blurb}</Muted>
            {opt.plan ? (
              <Muted className="mt-1">{money(opt.plan.result.totalInterestPaid)} total interest</Muted>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
