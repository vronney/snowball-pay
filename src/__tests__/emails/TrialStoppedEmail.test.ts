import { describe, expect, it } from 'vitest';
import { render } from '@react-email/render';
import * as React from 'react';
import TrialStoppedEmail from '@/emails/TrialStoppedEmail';

const unsubscribeUrl = 'https://getsnowballpay.com/api/email/unsubscribe?userId=u1&token=t1';

async function renderText(props: Partial<React.ComponentProps<typeof TrialStoppedEmail>> = {}) {
  return render(React.createElement(TrialStoppedEmail, { paymentsLogged: 4, unsubscribeUrl, ...props }), {
    plainText: true,
  });
}

describe('TrialStoppedEmail', () => {
  it('asks the one question and lists the five reasons to reply with', async () => {
    const text = await renderText({ userName: 'Jordan' });

    // Plain-text rendering upper-cases headings.
    expect(text).toContain('WHAT MADE YOU STOP, JORDAN?');
    expect(text).toMatch(/1\.\s+I went back to a spreadsheet/);
    expect(text).toMatch(/2\.\s+Setting up my debts took too long/);
    expect(text).toMatch(/3\.\s+I could not tell what it was doing for me/);
    expect(text).toMatch(/4\.\s+Money is tight and \$12 is not happening/);
    expect(text).toMatch(/5\.\s+Something else/);
    expect(text).toContain('Answer 4 is a completely legitimate answer');
  });

  it('never pitches: no upgrade link, no price anchor, no button', async () => {
    const html = await render(React.createElement(TrialStoppedEmail, { paymentsLogged: 4, unsubscribeUrl }));

    expect(html).not.toContain('checkout=pro');
    expect(html).not.toMatch(/Keep Pro/i);
    expect(html).not.toMatch(/\/month/);
  });

  it('names the logged payments that are still there, with correct plurals', async () => {
    expect(await renderText({ paymentsLogged: 4 })).toContain('along with the 4 payments you logged.');
    expect(await renderText({ paymentsLogged: 1 })).toContain('along with the 1 payment you logged.');
  });

  it('falls back to the plan when nothing was ever logged', async () => {
    const text = await renderText({ paymentsLogged: 0 });

    expect(text).toContain('Your account and your plan are still there');
    expect(text).not.toMatch(/0 payments/);
  });

  it('carries the unsubscribe link and a default greeting', async () => {
    const text = await renderText();

    expect(text).toContain('WHAT MADE YOU STOP, THERE?');
    expect(text).toContain(unsubscribeUrl);
  });
});
