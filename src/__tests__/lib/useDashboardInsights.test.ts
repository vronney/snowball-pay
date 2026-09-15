// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { useDashboardInsights } from '@/lib/hooks';

const day = vi.hoisted(() => ({ change: null as ((next: string) => void) | null }));

vi.mock('@/lib/dashboard/today', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/dashboard/today')>()),
  localDateParam: () => '2026-09-14',
  onLocalDayChange: (onChange: (next: string) => void) => {
    day.change = onChange;
    return () => { day.change = null; };
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useDashboardInsights', () => {
  it("keeps the previous day's figures on screen while the new day loads", async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValueOnce({ data: { asOf: 'day-1' } });
    const { result } = renderHook(() => useDashboardInsights(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual({ asOf: 'day-1' }));

    let resolveNext: (value: unknown) => void = () => {};
    get.mockReturnValueOnce(new Promise((resolve) => { resolveNext = resolve; }) as never);
    act(() => day.change?.('2026-09-15'));

    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith(
        expect.stringContaining('/api/dashboard/insights'),
        { params: { today: '2026-09-15' } },
      ),
    );
    expect(result.current.data).toEqual({ asOf: 'day-1' });
    expect(result.current.isPlaceholderData).toBe(true);

    await act(async () => { resolveNext({ data: { asOf: 'day-2' } }); });
    await waitFor(() => expect(result.current.data).toEqual({ asOf: 'day-2' }));
    expect(result.current.isPlaceholderData).toBe(false);
  });
});
