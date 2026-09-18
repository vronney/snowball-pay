import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    debt: { findUnique: vi.fn(), delete: vi.fn(), count: vi.fn() },
    user: { update: vi.fn() },
    plaidItem: { findUnique: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/auth-server', () => ({
  verifyAuth: vi.fn(),
  unauthorized: vi.fn(() => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })),
  badRequest: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 400 })),
  serverError: vi.fn((msg: string) => new Response(JSON.stringify({ error: msg }), { status: 500 })),
  isValidId: vi.fn(() => true),
}));
vi.mock('@/lib/plaid', () => ({ plaidClient: { itemRemove: vi.fn() }, logPlaidError: vi.fn() }));
vi.mock('@/lib/plaidCrypto', () => ({ decryptToken: vi.fn() }));

import { DELETE } from '@/app/api/debts/[id]/route';
import { verifyAuth } from '@/lib/auth-server';

const params = Promise.resolve({ id: 'debt_1' });

describe('DELETE /api/debts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAuth).mockResolvedValue({ valid: true as const, user: { id: 'user_1', email: 'owner@example.com' } });
    mockPrisma.debt.delete.mockReturnValue('DELETE_OP');
    mockPrisma.user.update.mockReturnValue('TOUCH_OP');
    mockPrisma.$transaction.mockResolvedValue([]);
  });

  it('deletes the debt and stamps the user as having edited the plan, atomically', async () => {
    mockPrisma.debt.findUnique.mockResolvedValue({ id: 'debt_1', userId: 'user_1', plaidItemId: null });

    const res = await DELETE(new NextRequest('http://localhost/api/debts/debt_1', { method: 'DELETE' }), { params });

    expect(res.status).toBe(200);
    expect(mockPrisma.$transaction).toHaveBeenCalledWith(['DELETE_OP', 'TOUCH_OP']);
    expect(mockPrisma.debt.delete).toHaveBeenCalledWith({ where: { id: 'debt_1' } });
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user_1' }, data: { planEditedAt: expect.any(Date) } }),
    );
  });

  it('refuses another user\'s debt without touching anything', async () => {
    mockPrisma.debt.findUnique.mockResolvedValue({ id: 'debt_1', userId: 'someone_else', plaidItemId: null });

    const res = await DELETE(new NextRequest('http://localhost/api/debts/debt_1', { method: 'DELETE' }), { params });

    expect(res.status).toBe(400);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});
