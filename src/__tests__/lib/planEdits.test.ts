import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { user: { update: vi.fn(), findUnique: vi.fn() } },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { markPlanEdited, readPlanEditedAt } from '@/lib/planEdits';

const missingColumn = () =>
  new Prisma.PrismaClientKnownRequestError('The column `planEditedAt` does not exist in the current database.', {
    code: 'P2022',
    clientVersion: 'test',
  });

describe('planEdits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('markPlanEdited', () => {
    it('stamps the user with now', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: 'u1' });

      await markPlanEdited('u1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u1' }, data: { planEditedAt: expect.any(Date) } }),
      );
    });

    it('never throws: a failed stamp is logged, not surfaced to the delete', async () => {
      mockPrisma.user.update.mockRejectedValue(missingColumn());

      await expect(markPlanEdited('u1')).resolves.toBeUndefined();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('readPlanEditedAt', () => {
    it('returns the stamp, or null when the user never deleted a plan row', async () => {
      const at = new Date('2026-09-10T00:00:00Z');
      mockPrisma.user.findUnique.mockResolvedValueOnce({ planEditedAt: at }).mockResolvedValueOnce({ planEditedAt: null });

      expect(await readPlanEditedAt('u1')).toEqual({ ok: true, planEditedAt: at });
      expect(await readPlanEditedAt('u1')).toEqual({ ok: true, planEditedAt: null });
    });

    it('collapses only the missing-column rollout error to "no stamp"', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(missingColumn());

      expect(await readPlanEditedAt('u1')).toEqual({ ok: false, reason: 'column_missing' });
      expect(console.warn).toHaveBeenCalled();
    });

    it('reports any other failure as unknown rather than as no activity', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('connection reset'));

      expect(await readPlanEditedAt('u1')).toEqual({ ok: false, reason: 'failed' });
      expect(console.error).toHaveBeenCalled();
    });
  });
});
