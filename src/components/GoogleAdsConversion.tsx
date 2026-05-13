'use client';

import { useEffect } from 'react';

const GOOGLE_ADS_CONVERSION_SEND_TO = 'AW-18159208162/vtzzCKnrx6wcEOKN_tJD';

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
    send_to: GOOGLE_ADS_CONVERSION_SEND_TO,
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
