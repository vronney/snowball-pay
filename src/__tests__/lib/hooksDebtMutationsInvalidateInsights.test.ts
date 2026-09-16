// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { useCreateDebt, useDeleteDebt, useMarkPaid, useUnmarkPaid, useUpdateDebt } from '@/lib/hooks';

// Round 5 (Codex r3) P2: adding, editing or deleting a debt must invalidate
// ['dashboard-insights'] too, or DebtsV2's closing card / summary / outside-plan
// notice keep reading the stale cached insights response (see brief P2).
//
// Round 6 (Codex r4) P2-b: logging or unlogging a payment recomputes the rows
// and the local plan from the new balance, but the closing card's
// ['dashboard-insights', today] query keeps the old figures until this
// invalidation runs too.

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
  function wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  }
  return { wrapper, invalidateQueries };
}

function invalidatedKeys(spy: ReturnType<typeof makeWrapper>['invalidateQueries']): unknown[][] {
  return spy.mock.calls.map((call: unknown[]) => (call[0] as { queryKey?: unknown[] })?.queryKey ?? []);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('debt mutations invalidate dashboard-insights', () => {
  it('useCreateDebt invalidates dashboard-insights alongside debts', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { debt: { id: 'd1' } } });
    const { wrapper, invalidateQueries } = makeWrapper();
    const { result } = renderHook(() => useCreateDebt(), { wrapper });

    result.current.mutate({ name: 'Card', balance: 100 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = invalidatedKeys(invalidateQueries);
    expect(keys).toContainEqual(['debts']);
    expect(keys).toContainEqual(['dashboard-insights']);
  });

  it('useUpdateDebt invalidates dashboard-insights alongside its existing keys', async () => {
    vi.spyOn(axios, 'patch').mockResolvedValue({ data: { debt: { id: 'd1' } } });
    const { wrapper, invalidateQueries } = makeWrapper();
    const { result } = renderHook(() => useUpdateDebt(), { wrapper });

    result.current.mutate({ id: 'd1', updates: { balance: 50 } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = invalidatedKeys(invalidateQueries);
    expect(keys).toContainEqual(['debts']);
    expect(keys).toContainEqual(['debt', 'd1']);
    expect(keys).toContainEqual(['snapshots']);
    expect(keys).toContainEqual(['accelerationStats']);
    expect(keys).toContainEqual(['dashboard-insights']);
  });

  it('useDeleteDebt invalidates dashboard-insights alongside debts', async () => {
    vi.spyOn(axios, 'delete').mockResolvedValue({ data: {} });
    const { wrapper, invalidateQueries } = makeWrapper();
    const { result } = renderHook(() => useDeleteDebt(), { wrapper });

    result.current.mutate('d1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = invalidatedKeys(invalidateQueries);
    expect(keys).toContainEqual(['debts']);
    expect(keys).toContainEqual(['dashboard-insights']);
  });

  it('useMarkPaid invalidates dashboard-insights alongside its existing keys', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ data: {} });
    const { wrapper, invalidateQueries } = makeWrapper();
    const { result } = renderHook(() => useMarkPaid(), { wrapper });

    result.current.mutate({ debtId: 'd1', amount: 50, dueYear: 2026, dueMonth: 8 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = invalidatedKeys(invalidateQueries);
    expect(keys).toContainEqual(['payments']);
    expect(keys).toContainEqual(['debts']);
    expect(keys).toContainEqual(['snapshots']);
    expect(keys).toContainEqual(['accelerationStats']);
    expect(keys).toContainEqual(['recommendations']);
    expect(keys).toContainEqual(['dashboard-insights']);
  });

  it('useUnmarkPaid invalidates dashboard-insights alongside its existing keys', async () => {
    vi.spyOn(axios, 'delete').mockResolvedValue({ data: {} });
    const { wrapper, invalidateQueries } = makeWrapper();
    const { result } = renderHook(() => useUnmarkPaid(), { wrapper });

    result.current.mutate({ recordId: 'r1', debtId: 'd1', dueYear: 2026, dueMonth: 8 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = invalidatedKeys(invalidateQueries);
    expect(keys).toContainEqual(['payments']);
    expect(keys).toContainEqual(['debts']);
    expect(keys).toContainEqual(['snapshots']);
    expect(keys).toContainEqual(['accelerationStats']);
    expect(keys).toContainEqual(['dashboard-insights']);
  });
});
