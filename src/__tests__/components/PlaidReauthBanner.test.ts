// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { act, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { PlaidReauthBanner } from '@/components/plaid/PlaidReauthBanner';

const plaid = vi.hoisted(() => ({ onSuccess: null as null | (() => Promise<void>) }));

vi.mock('react-plaid-link', () => ({
  usePlaidLink: (config: { onSuccess: () => Promise<void> }) => {
    plaid.onSuccess = config.onSuccess;
    return { open: vi.fn(), ready: false };
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PlaidReauthBanner', () => {
  it('refreshes dashboard insights after the reconnect is confirmed', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ data: {} });
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    render(createElement(QueryClientProvider, { client }, createElement(PlaidReauthBanner, { plaidItemId: 'item-1' })));

    await act(async () => { await plaid.onSuccess?.(); });

    expect(axios.post).toHaveBeenCalledWith('/api/plaid/clear-reauth', { plaidItemId: 'item-1' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard-insights'] });
  });
});
