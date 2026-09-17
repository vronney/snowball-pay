// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { useStartTrial } from '@/lib/hooks';

vi.mock('@/lib/dashboard/today', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/dashboard/today')>()),
  localDateParam: () => '2026-09-17',
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useStartTrial', () => {
  it("posts the client's day and refreshes subscription and debts (insights refresh through the global cache)", async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
    const post = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { proEligible: true, paidPro: false, signupTrialEndsAt: '2026-10-01T12:00:00.000Z' },
    });

    const { result } = renderHook(() => useStartTrial(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/api\/trial\/start$/), { today: '2026-09-17' });
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['subscription'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['debts'] });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['dashboard-insights'] });
  });
});
