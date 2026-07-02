'use client';

import { useEffect } from 'react';

const GOOGLE_ADS_CLICK_CONVERSION_SEND_TO = 'AW-18159208162/vtzzCKnrx6wcEOKN_tJD';
const GOOGLE_ADS_PAGE_VIEW_CONVERSION_SEND_TO = 'AW-18159208162/B2GpCOy7y6wcEOKN_tJD';
const GOOGLE_ADS_SIGNUP_CONVERSION_SEND_TO = 'AW-18159208162/QQHKCLLJ_sQcEOKN_tJD';

const CALCULATOR_NAMES: Record<string, string> = {
  default: 'Free Debt Payoff Calculator',
  'credit-card-payoff': 'Credit Card Payoff Calculator',
  'student-loan-payoff': 'Student Loan Payoff Calculator',
  'auto-loan-payoff': 'Auto Loan Payoff Calculator',
  'personal-loan-payoff': 'Personal Loan Payoff Calculator',
};

interface CalculatorClickTarget {
  href: string;
  name: string;
  path: string;
  slug: string;
}

interface GoogleAdsPageViewConversionProps {
  calculatorName: string;
  calculatorSlug: string;
}

function getCalculatorClickTarget(href: string): CalculatorClickTarget | null {
  const url = new URL(href, window.location.href);

  if (url.origin !== window.location.origin) {
    return null;
  }

  if (url.pathname === '/calculator') {
    return {
      href: url.href,
      name: CALCULATOR_NAMES.default,
      path: url.pathname,
      slug: 'default',
    };
  }

  const calculatorPrefix = '/calculators/';
  if (!url.pathname.startsWith(calculatorPrefix)) {
    return null;
  }

  const slug = url.pathname.slice(calculatorPrefix.length).split('/')[0];
  if (!slug) {
    return null;
  }

  return {
    href: url.href,
    name: CALCULATOR_NAMES[slug] ?? slug,
    path: url.pathname,
    slug,
  };
}

function reportCalculatorClickConversion(target: CalculatorClickTarget) {
  const gtag = (window as any).gtag;
  let hasNavigated = false;

  const navigate = () => {
    if (hasNavigated) {
      return;
    }

    hasNavigated = true;
    window.location.href = target.href;
  };

  if (typeof gtag !== 'function') {
    navigate();
    return;
  }

  window.setTimeout(navigate, 1000);

  gtag('event', 'conversion', {
    send_to: GOOGLE_ADS_CLICK_CONVERSION_SEND_TO,
    event_callback: navigate,
    event_timeout: 1000,
    event_category: 'calculator',
    event_label: target.name,
    calculator_name: target.name,
    calculator_slug: target.slug,
    click_url: target.href,
    page_path: window.location.pathname,
    target_page_path: target.path,
  });
}

/**
 * Fires the "Sign-up – Start Plan" conversion. Call this on the success state —
 * the moment a user actually completes onboarding and their first plan is
 * generated — NOT on the Start Plan button click. Safe to call before a
 * client-side redirect (gtag uses a sendBeacon transport, so it isn't lost).
 *
 * @param email Enhanced Conversions: the signed-in user's email. gtag hashes it
 *   (SHA-256) client-side before transmission — Google never receives the raw
 *   address. Improves ad-click ↔ signup matching; omit and the conversion
 *   still fires normally.
 * @param transactionId Dedup key — reuse the onboarding submit's idempotency
 *   key so a retried submission can't double-count the conversion.
 */
export function reportSignupConversion(
  email?: string | null,
  transactionId?: string | null,
) {
  const gtag = (window as any).gtag;

  if (typeof gtag !== 'function') {
    return;
  }

  if (email) {
    gtag('set', 'user_data', {
      email: email.trim().toLowerCase(),
    });
  }

  gtag('event', 'conversion', {
    send_to: GOOGLE_ADS_SIGNUP_CONVERSION_SEND_TO,
    value: 1.0,
    currency: 'USD',
    ...(transactionId ? { transaction_id: transactionId } : {}),
    event_category: 'signup',
    event_label: 'Start Plan',
    page_path: window.location.pathname,
  });
}

export function GoogleAdsPageViewConversion({
  calculatorName,
  calculatorSlug,
}: GoogleAdsPageViewConversionProps) {
  useEffect(() => {
    const gtag = (window as any).gtag;

    if (typeof gtag !== 'function') {
      return;
    }

    gtag('event', 'conversion', {
      send_to: GOOGLE_ADS_PAGE_VIEW_CONVERSION_SEND_TO,
      value: 1.0,
      currency: 'USD',
      event_category: 'calculator',
      event_label: calculatorName,
      calculator_name: calculatorName,
      calculator_slug: calculatorSlug,
      page_path: window.location.pathname,
    });
  }, [calculatorName, calculatorSlug]);

  return null;
}

export function GoogleAdsConversion() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>('a[href]')
        : null;

      if (!target || target.target === '_blank' || target.hasAttribute('download')) {
        return;
      }

      const conversionTarget = getCalculatorClickTarget(target.href);
      if (!conversionTarget) {
        return;
      }

      event.preventDefault();
      reportCalculatorClickConversion(conversionTarget);
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return null;
}
