import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma, mockItemRemove, mockIsPlaidAllowed, mockHasPaidPro } = vi.hoisted(() => ({
  mockPrisma: {
    user: { findUnique: vi.fn() },
    debt: { updateMany: vi.fn() },
    plaidItem: { delete: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  },
  mockItemRemove: vi.fn(),
  mockIsPlaidAllowed: vi.fn(),
  mockHasPaidPro: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/plaid', () => ({
  plaidClient: { itemRemove: mockItemRemove },
  isPlaidAllowed: mockIsPlaidAllowed,
  logPlaidError: vi.fn(),
}));
vi.mock('@/lib/plaidCrypto', () => ({
  decryptToken: vi.fn((token: string) => `decrypted-${token}`),
}));
vi.mock('@/lib/gates', () => ({ hasPaidPro: mockHasPaidPro }));

import { removePlaidItemsForCanceledUser } from '@/lib/plaidCleanup';

function userWithItems(items: Array<{ id: string; accessToken: string }>) {
  return { email: 'person@example.com', plaidItems: items };
}

describe('removePlaidItemsForCanceledUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(
      userWithItems([
        { id: 'item_row_1', accessToken: 'enc_1' },
        { id: 'item_row_2', accessToken: 'enc_2' },
      ]),
    );
    mockPrisma.debt.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.plaidItem.delete.mockResolvedValue({});
    mockItemRemove.mockResolvedValue({});
    mockIsPlaidAllowed.mockReturnValue(false);
    mockHasPaidPro.mockResolvedValue(false);
  });

  it('revokes every item with Plaid and deletes the local rows', async () => {
    const result = await removePlaidItemsForCanceledUser('user_1');

    expect(result).toEqual({ outcome: 'removed', removed: 2, revokeErrors: 0 });
    expect(mockItemRemove).toHaveBeenCalledTimes(2);
    expect(mockItemRemove).toHaveBeenCalledWith({ access_token: 'decrypted-enc_1' });
    expect(mockItemRemove).toHaveBeenCalledWith({ access_token: 'decrypted-enc_2' });
    expect(mockPrisma.debt.updateMany).toHaveBeenCalledWith({
      where: { plaidItemId: 'item_row_1' },
      data: { isLinked: false },
    });
    expect(mockPrisma.plaidItem.delete).toHaveBeenCalledWith({ where: { id: 'item_row_1' } });
    expect(mockPrisma.plaidItem.delete).toHaveBeenCalledWith({ where: { id: 'item_row_2' } });
  });

  it('still deletes local rows when the Plaid revoke call fails', async () => {
    mockItemRemove.mockRejectedValueOnce(new Error('ITEM_NOT_FOUND'));

    const result = await removePlaidItemsForCanceledUser('user_1');

    expect(result).toEqual({ outcome: 'removed', removed: 2, revokeErrors: 1 });
    expect(mockPrisma.plaidItem.delete).toHaveBeenCalledTimes(2);
  });

  it('keeps items for allowlisted testers', async () => {
    mockIsPlaidAllowed.mockReturnValue(true);

    const result = await removePlaidItemsForCanceledUser('user_1');

    expect(result).toEqual({ outcome: 'skipped_allowlisted' });
    expect(mockItemRemove).not.toHaveBeenCalled();
    expect(mockPrisma.plaidItem.delete).not.toHaveBeenCalled();
  });

  it('keeps items when the user is paid Pro again (out-of-order webhooks)', async () => {
    mockHasPaidPro.mockResolvedValue(true);

    const result = await removePlaidItemsForCanceledUser('user_1');

    expect(result).toEqual({ outcome: 'skipped_still_pro' });
    expect(mockItemRemove).not.toHaveBeenCalled();
  });

  it('does nothing for users with no linked items', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userWithItems([]));

    const result = await removePlaidItemsForCanceledUser('user_1');

    expect(result).toEqual({ outcome: 'no_items' });
    expect(mockItemRemove).not.toHaveBeenCalled();
  });

  it('swallows unexpected failures instead of throwing (webhook safety)', async () => {
    mockPrisma.user.findUnique.mockRejectedValue(new Error('db down'));

    const result = await removePlaidItemsForCanceledUser('user_1');

    expect(result).toEqual({ outcome: 'error' });
  });
});
