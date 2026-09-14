import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SavePlanModal, {
  trackSavePlanModalDismiss,
} from '@/components/calculator/SavePlanModal';
import { ConsentBannerPanel } from '@/components/analytics/AnalyticsConsentBanner';
import { track } from '@/lib/analytics';

vi.mock('@/lib/analytics', () => ({
  track: vi.fn(),
  Events: {
    SAVE_PLAN_MODAL_DISMISSED: 'save_plan_modal_dismissed',
  },
}));

/** Pull the numeric z-index a rendered element declares, via the given pattern. */
function zIndexOf(html: string, selector: RegExp): number {
  const match = html.match(selector);
  if (!match) throw new Error(`no z-index found for ${selector}`);
  return Number(match[1]);
}

describe('SavePlanModal', () => {
  it('stacks above the analytics consent banner so the sheet cannot cover its form', () => {
    const modal = renderToStaticMarkup(
      createElement(SavePlanModal, {
        onClose: vi.fn(),
        debtFreeDate: 'Mar 2029',
        interestSaved: 1200,
      }),
    );
    const banner = renderToStaticMarkup(createElement(ConsentBannerPanel, { onChoose: vi.fn() }));

    const modalLayer = zIndexOf(modal, /z-index:(\d+)/);
    const bannerLayer = zIndexOf(banner, /z-\[(\d+)\]/);
    expect(modalLayer).toBeGreaterThan(bannerLayer);
    // Same layer as the other in-app modals, not a bespoke value.
    expect(modalLayer).toBe(9999);
  });

  it('tracks dismiss reasons for save-plan modal exits', () => {
    const mockTrack = vi.mocked(track);

    trackSavePlanModalDismiss('backdrop');
    trackSavePlanModalDismiss('close_icon');
    trackSavePlanModalDismiss('close_without_saving');

    expect(mockTrack).toHaveBeenNthCalledWith(1, 'save_plan_modal_dismissed', {
      source: 'calculator_result',
      reason: 'backdrop',
    });
    expect(mockTrack).toHaveBeenNthCalledWith(2, 'save_plan_modal_dismissed', {
      source: 'calculator_result',
      reason: 'close_icon',
    });
    expect(mockTrack).toHaveBeenNthCalledWith(3, 'save_plan_modal_dismissed', {
      source: 'calculator_result',
      reason: 'close_without_saving',
    });
  });
});
