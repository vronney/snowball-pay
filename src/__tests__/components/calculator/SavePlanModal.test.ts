// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fireEvent, render, screen } from '@testing-library/react';
import SavePlanModal from '@/components/calculator/SavePlanModal';
import { ConsentBannerPanel } from '@/components/analytics/AnalyticsConsentBanner';
import { track } from '@/lib/analytics';

vi.mock('@/lib/analytics', () => ({
  track: vi.fn(),
  Events: {
    SAVE_PLAN_MODAL_VIEWED: 'save_plan_modal_viewed',
    SAVE_PLAN_MODAL_DISMISSED: 'save_plan_modal_dismissed',
    PLAN_SAVED_EMAIL: 'plan_saved_email_captured',
    SIGNUP_STARTED: 'signup_started',
  },
}));

/** Pull the numeric z-index a rendered element declares, via the given pattern. */
function zIndexOf(html: string, selector: RegExp): number {
  const match = html.match(selector);
  if (!match) throw new Error(`no z-index found for ${selector}`);
  return Number(match[1]);
}

describe('SavePlanModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

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

  it('tracks backdrop dismiss and closes modal', () => {
    const onClose = vi.fn();
    const mockTrack = vi.mocked(track);

    render(
      createElement(SavePlanModal, {
        onClose,
        debtFreeDate: 'Mar 2029',
        interestSaved: 1200,
      }),
    );
    mockTrack.mockClear();
    fireEvent.click(screen.getByRole('dialog'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith('save_plan_modal_dismissed', {
      source: 'calculator_result',
      reason: 'backdrop',
    });
  });

  it('tracks close-icon dismiss and closes modal', () => {
    const onClose = vi.fn();
    const mockTrack = vi.mocked(track);

    render(
      createElement(SavePlanModal, {
        onClose,
        debtFreeDate: 'Mar 2029',
        interestSaved: 1200,
      }),
    );
    mockTrack.mockClear();
    fireEvent.click(screen.getByLabelText('Close'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith('save_plan_modal_dismissed', {
      source: 'calculator_result',
      reason: 'close_icon',
    });
  });

  it('tracks text-link dismiss and closes modal', () => {
    const onClose = vi.fn();
    const mockTrack = vi.mocked(track);

    render(
      createElement(SavePlanModal, {
        onClose,
        debtFreeDate: 'Mar 2029',
        interestSaved: 1200,
      }),
    );
    mockTrack.mockClear();
    fireEvent.click(screen.getByText('Close without saving my plan'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith('save_plan_modal_dismissed', {
      source: 'calculator_result',
      reason: 'close_without_saving',
    });
  });

  it('tracks email capture/start and redirects on submit', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true } as Response)));
    const mockTrack = vi.mocked(track);
    const assignSpy = vi.fn();
    vi.stubGlobal(
      'location',
      { ...window.location, assign: assignSpy } as unknown as Location,
    );

    render(
      createElement(SavePlanModal, {
        onClose: vi.fn(),
        debtFreeDate: 'Mar 2029',
        interestSaved: 1200,
      }),
    );
    mockTrack.mockClear();

    const emailInput = screen.getByLabelText('Your email');
    fireEvent.change(emailInput, {
      target: { value: 'User+test@example.com ' },
    });
    fireEvent.submit(emailInput.closest('form')!);

    expect(mockTrack).toHaveBeenCalledWith('plan_saved_email_captured', {
      source: 'save_plan_modal',
    }, {
      transport: 'sendBeacon',
      send_instantly: true,
    });
    expect(mockTrack).toHaveBeenCalledWith('signup_started', {
      source: 'save_plan_modal',
    }, {
      transport: 'sendBeacon',
      send_instantly: true,
    });
    expect(assignSpy).toHaveBeenCalledWith(
      '/auth/login?returnTo=%2Fonboarding%3Fsource%3Dcalculator&screen_hint=signup&login_hint=user%2Btest%40example.com',
    );
  });
});
