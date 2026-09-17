// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { useMarkPaid, type MarkPaidResult } from '@/lib/hooks';

const triggerCelebration = vi.fn();
const triggerCelebrationLoading = vi.fn();
vi.mock('@/lib/celebrationState', () => ({
  triggerCelebration: (...args: unknown[]) => triggerCelebration(...args),
  triggerCelebrationLoading: () => triggerCelebrationLoading(),
}));

const DEBT = {
  id: 'debt_1',
  name: 'Visa',
  balance: 500,
  originalBalance: 1000,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  client.setQueryData(['debts'], { debts: [DEBT] });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: {} });
  const { result } = renderHook(() => useMarkPaid(), { wrapper });
  return { result, post, client };
}

const ARGS = { debtId: 'debt_1', amount: 200, dueYear: 2026, dueMonth: 8 };

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('useMarkPaid celebration handling', () => {
  it('celebrates a lone payment by default', async () => {
    const { result } = setup();

    let returned: unknown;
    await act(async () => {
      returned = await result.current.mutateAsync(ARGS);
    });

    // The celebration is fired, not handed back.
    expect((returned as { celebration?: unknown }).celebration).toBeUndefined();
    await vi.waitFor(() => expect(triggerCelebrationLoading).toHaveBeenCalled());
  });

  it('hands the payload back instead of firing when celebrate is false', async () => {
    const { result } = setup();

    let returned: MarkPaidResult = {};
    await act(async () => {
      returned = await result.current.mutateAsync({ ...ARGS, celebrate: false });
    });

    expect(returned.celebration).toMatchObject({
      debtId: 'debt_1',
      debtName: 'Visa',
      amountPaid: 200,
      // 1000 - 500 already paid, plus this payment.
      totalDebtPaid: 700,
      totalDebtOriginal: 1000,
      debtBalance: 300,
      debtOriginalBalance: 1000,
    });
    expect(triggerCelebrationLoading).not.toHaveBeenCalled();
    expect(triggerCelebration).not.toHaveBeenCalled();
  });

  it('neither fires nor hands back a payload when the month was already marked', async () => {
    const { result } = setup();
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { alreadyMarked: true } });

    let returned: { celebration?: unknown } = {};
    await act(async () => {
      returned = await result.current.mutateAsync({ ...ARGS, celebrate: false });
    });

    expect(returned.celebration).toBeUndefined();
    expect(triggerCelebrationLoading).not.toHaveBeenCalled();
  });

  it('hands back nothing when the debt is missing from the cache', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    client.setQueryData(['debts'], { debts: [] });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children);
    vi.spyOn(axios, 'post').mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useMarkPaid(), { wrapper });

    let returned: { celebration?: unknown } = {};
    await act(async () => {
      returned = await result.current.mutateAsync({ ...ARGS, celebrate: false });
    });

    expect(returned.celebration).toBeUndefined();
    expect(triggerCelebrationLoading).not.toHaveBeenCalled();
  });
});
