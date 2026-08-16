import { describe, expect, it } from 'vitest';
import {
  LATE_TRIAL_NOTICE_DAYS,
  UPGRADE_MESSAGE_VERSION,
  getUpgradeMessage,
  shouldShowLateTrialNotice,
} from '@/lib/upgradeMessaging';

describe('upgrade messaging', () => {
  it('uses one stable version for funnel segmentation', () => {
    expect(UPGRADE_MESSAGE_VERSION).toBe('contextual_v3');
  });

  it.each([
    ['Unlimited debts', 'unlimited_debts'],
    ['Bank sync', 'bank_sync'],
    // The slider gate commits an acceleration amount, so it gets the
    // acceleration message — only explore-only scenarios map to what_if.
    ['What-if slider', 'acceleration'],
    ['Acceleration control', 'acceleration'],
    ['What-if scenarios', 'what_if'],
    ['Payoff Coach', 'coach'],
    ['AI Coach Brief', 'coach'],
    ['Intelligence', 'intelligence'],
    ['Custom priority order', 'custom_priority'],
    ['Export payoff plan', 'export_plan'],
    ['Trial ended', 'trial_ended'],
  ])('maps %s to the %s value message', (feature, expectedId) => {
    expect(getUpgradeMessage(feature).id).toBe(expectedId);
  });

  it('uses the follow-through message for unknown and settings entry points', () => {
    expect(getUpgradeMessage().id).toBe('general');
    expect(getUpgradeMessage('Something new').id).toBe('general');
  });

  it('keeps every message focused to three concrete benefits', () => {
    for (const feature of [
      undefined,
      'Unlimited debts',
      'Bank sync',
      'What-if scenarios',
      'Payoff Coach',
      'Intelligence',
    ]) {
      expect(getUpgradeMessage(feature).benefits).toHaveLength(3);
    }
  });

  it('shows the billing notice only in the final trial week', () => {
    expect(LATE_TRIAL_NOTICE_DAYS).toBe(7);
    expect(shouldShowLateTrialNotice(8)).toBe(false);
    expect(shouldShowLateTrialNotice(7)).toBe(true);
    expect(shouldShowLateTrialNotice(0)).toBe(true);
    expect(shouldShowLateTrialNotice(-1)).toBe(false);
  });
});
