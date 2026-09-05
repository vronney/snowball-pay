import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AnalyticsConsentBanner, {
  CONSENT_BANNER_OFFSET_VAR,
  ConsentBannerPanel,
} from '@/components/analytics/AnalyticsConsentBanner';
import MobileResultBar from '@/components/calculator/MobileResultBar';

/** Static markup of the prompt itself, independent of storage and hydration. */
function renderPanel() {
  return renderToStaticMarkup(createElement(ConsentBannerPanel, { onChoose: vi.fn() }));
}

describe('AnalyticsConsentBanner', () => {
  it('renders nothing on the server so a saved choice never flashes the prompt', () => {
    expect(renderToStaticMarkup(createElement(AnalyticsConsentBanner))).toBe('');
  });

  it('is a labelled dialog offering both choices and the privacy page', () => {
    const html = renderPanel();
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="Analytics preferences"');
    expect(html).toContain('Essential only');
    expect(html).toContain('Allow analytics');
    expect(html).toContain('href="/privacy"');
  });

  it('shows the short copy below sm and the full explanation from sm up', () => {
    const html = renderPanel();
    // Phone copy: one sentence each on what is and is not collected.
    expect(html).toMatch(/<span class="sm:hidden">Usage is measured without cookies/);
    // The full explanation is what the wider layouts show.
    expect(html).toMatch(/<span class="hidden sm:inline">We measure product usage with cookieless analytics/);
    // Both variants still name what "allow" adds, so neither understates it.
    expect(html.match(/Google Ads/g)).toHaveLength(2);
    expect(html.match(/masked session replay/g)).toHaveLength(2);
  });

  it('is an edge-to-edge sheet on phones and a floating card at sm and up', () => {
    const html = renderPanel();
    expect(html).toContain('fixed inset-x-0 bottom-0');
    expect(html).toContain('rounded-t-xl');
    expect(html).toContain('sm:inset-x-4 sm:bottom-4 sm:max-w-[720px] sm:rounded-xl');
    // Safe-area padding so the buttons clear the home indicator.
    expect(html).toContain('env(safe-area-inset-bottom)');
    // Each button fills half the row on phones and shrinks to content wider up.
    expect(html.match(/class="flex-1 sm:flex-none"/g)).toHaveLength(2);
  });

  it('is what the mobile result bar offsets itself by while the banner is up', () => {
    const html = renderToStaticMarkup(
      createElement(MobileResultBar, {
        timeStr: '1y 2m',
        totalInterest: 1234,
        resultsRef: { current: null },
      }),
    );
    expect(html).toContain(`bottom:var(${CONSENT_BANNER_OFFSET_VAR}, 0px)`);
  });
});
