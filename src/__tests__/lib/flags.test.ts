import { describe, it, expect } from 'vitest';
import { isDashboardV2 } from '@/lib/flags';

describe('isDashboardV2 (spec §5.3)', () => {
  it('is off by default', () => {
    expect(isDashboardV2('owner@example.com', undefined)).toBe(false);
    expect(isDashboardV2('owner@example.com', '')).toBe(false);
  });
  it('matches listed emails case-insensitively, ignoring spaces', () => {
    expect(isDashboardV2('Owner@Example.com', ' owner@example.com , other@example.com ')).toBe(true);
    expect(isDashboardV2('someone@example.com', 'owner@example.com')).toBe(false);
  });
  it('turns on for everyone with "all"', () => {
    expect(isDashboardV2('anyone@example.com', 'all')).toBe(true);
    expect(isDashboardV2(null, 'owner@example.com,all')).toBe(true);
  });
  it('is off for a missing email unless "all"', () => {
    expect(isDashboardV2(undefined, 'owner@example.com')).toBe(false);
  });
});
