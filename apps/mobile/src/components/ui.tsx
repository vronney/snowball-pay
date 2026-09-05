import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type TextProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * The handful of primitives every screen composes. Visual rules come from
 * DESIGN.md: blue only on actions/progress, hierarchical radii, Plus Jakarta
 * Sans with weight carrying hierarchy, tabular numerals for money.
 */

export const colors = {
  primary: '#2563eb',
  muted: '#64748b',
  ink: '#0f172a',
  success: '#10b981',
  error: '#ef4444',
  line: '#e2e8f0',
};

export function Screen({
  children,
  scroll = true,
  padded = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
}) {
  const inner = <View className={padded ? 'px-5 pb-12 pt-2' : ''}>{children}</View>;
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="pb-8">
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <View
      className={`rounded-card border border-line bg-surface p-4 ${className}`}
      style={{ shadowColor: colors.ink, shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}
    >
      {children}
    </View>
  );
}

export function Title({ children, className = '' }: TextProps & { className?: string }) {
  return <Text className={`font-display text-[28px] leading-9 text-ink ${className}`}>{children}</Text>;
}

export function Heading({ children, className = '' }: TextProps & { className?: string }) {
  return <Text className={`font-bold text-[20px] text-ink ${className}`}>{children}</Text>;
}

export function Body({ children, className = '' }: TextProps & { className?: string }) {
  return <Text className={`font-body text-[15px] leading-6 text-ink ${className}`}>{children}</Text>;
}

export function Muted({ children, className = '' }: TextProps & { className?: string }) {
  return <Text className={`font-medium text-[13px] leading-5 text-muted ${className}`}>{children}</Text>;
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text className="font-semibold text-[10px] uppercase tracking-wider text-muted">{children}</Text>;
}

/** Money and dates — tabular numerals so columns line up. */
export function Num({ children, className = '', style, ...rest }: TextProps & { className?: string }) {
  return (
    <Text
      {...rest}
      className={`font-bold text-ink ${className}`}
      style={[{ fontVariant: ['tabular-nums'] }, style]}
    >
      {children}
    </Text>
  );
}

export function Tag({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'success' | 'warning' | 'primary' }) {
  const tones = {
    muted: 'bg-slate-100 text-muted',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    primary: 'bg-tint text-primary',
  };
  return (
    <View className={`self-start rounded-tag px-2 py-0.5 ${tones[tone].split(' ')[0]}`}>
      <Text className={`font-semibold text-[11px] ${tones[tone].split(' ')[1]}`}>{children}</Text>
    </View>
  );
}

interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'quiet' | 'danger';
  loading?: boolean;
  className?: string;
}

export function Button({ title, variant = 'primary', loading, disabled, className = '', ...rest }: ButtonProps) {
  const isDisabled = disabled || loading;
  const base = 'h-12 flex-row items-center justify-center rounded-button px-5';
  const styles = {
    primary: 'bg-primary active:bg-primary-hover',
    quiet: 'bg-slate-100 active:bg-slate-200',
    danger: 'bg-white border border-error',
  };
  const text = { primary: 'text-white', quiet: 'text-ink', danger: 'text-error' };
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={`${base} ${styles[variant]} ${isDisabled ? 'opacity-50' : ''} ${className}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.ink} />
      ) : (
        <Text className={`font-bold text-[15px] ${text[variant]}`}>{title}</Text>
      )}
    </Pressable>
  );
}

export function LinkText({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8}>
      <Text className="font-semibold text-[14px] text-primary">{title}</Text>
    </Pressable>
  );
}

interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string;
  prefix?: string;
  suffix?: string;
}

export function Field({ label, hint, error, prefix, suffix, className = '', ...rest }: FieldProps) {
  return (
    <View className="mb-3">
      <Text className="mb-1 font-semibold text-[13px] text-ink">{label}</Text>
      <View
        className={`h-11 flex-row items-center rounded-input border bg-surface px-3 ${
          error ? 'border-error' : 'border-line'
        }`}
      >
        {prefix ? <Text className="mr-1 font-medium text-[15px] text-muted">{prefix}</Text> : null}
        <TextInput
          className={`flex-1 font-medium text-[16px] text-ink ${className}`}
          placeholderTextColor="#94a3b8"
          style={{ fontVariant: ['tabular-nums'] }}
          {...rest}
        />
        {suffix ? <Text className="ml-1 font-medium text-[15px] text-muted">{suffix}</Text> : null}
      </View>
      {error ? (
        <Text className="mt-1 font-medium text-[12px] text-error">{error}</Text>
      ) : hint ? (
        <Text className="mt-1 font-medium text-[12px] text-muted">{hint}</Text>
      ) : null}
    </View>
  );
}

/** Loading / error / empty floor for every query-backed screen. */
export function StateView({
  kind,
  title,
  message,
  action,
}: {
  kind: 'loading' | 'error' | 'empty';
  title?: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <View className="items-center justify-center px-6 py-16">
      {kind === 'loading' ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          <Heading className="mb-2 text-center">{title ?? (kind === 'error' ? 'Something went wrong' : 'Nothing here yet')}</Heading>
          {message ? <Muted className="mb-4 text-center">{message}</Muted> : null}
          {action}
        </>
      )}
    </View>
  );
}

/** Endowed progress: never starts at 0% — the calculator counts as step 1. */
export function ProgressSteps({ step, total, labels }: { step: number; total: number; labels: string[] }) {
  return (
    <View className="mb-5">
      <View className="mb-2 h-1.5 flex-row overflow-hidden rounded-full bg-slate-200">
        <View className="h-full rounded-full bg-primary" style={{ width: `${Math.round((step / total) * 100)}%` }} />
      </View>
      <View className="flex-row justify-between">
        {labels.map((label, i) => (
          <Text
            key={label}
            className={`font-semibold text-[11px] ${i < step ? 'text-ink' : 'text-faint'}`}
          >
            {i < step ? '✓ ' : ''}
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}
