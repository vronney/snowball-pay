import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SavePlanModal from '@/components/calculator/SavePlanModal';
import { ConsentBannerPanel } from '@/components/analytics/AnalyticsConsentBanner';

vi.mock('@/lib/analytics', () => ({ track: vi.fn(), Events: {} }));

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
});
