export const CANCELLATION_REASON_VALUES = [
  'too_expensive',
  'not_using_enough',
  'missing_feature',
  'technical_issue',
  'temporary_break',
  'plan_complete',
  'other',
] as const;

export type CancellationReason = (typeof CANCELLATION_REASON_VALUES)[number];

interface CancellationReasonOption {
  value: CancellationReason;
  label: string;
  guidance: string;
  supportLink?: boolean;
}

export const CANCELLATION_REASON_OPTIONS: readonly CancellationReasonOption[] = [
  {
    value: 'too_expensive',
    label: 'It costs more than I can spend right now',
    guidance:
      'If you cancel in Stripe, your account returns to Free. Free includes the core payoff plan for up to five debts.',
  },
  {
    value: 'not_using_enough',
    label: "I'm not using it enough",
    guidance:
      'A short monthly check-in can be enough: record payments, review the next target, and adjust the plan when life changes.',
  },
  {
    value: 'missing_feature',
    label: 'A feature I need is missing',
    guidance:
      'Tell us what is missing. We read every note, and we can help confirm whether there is already a practical workaround.',
    supportLink: true,
  },
  {
    value: 'technical_issue',
    label: 'Something is not working',
    guidance:
      'We would like a chance to fix it. Contact support with what happened and where you got stuck.',
    supportLink: true,
  },
  {
    value: 'temporary_break',
    label: 'I only need a temporary break',
    guidance:
      'Stripe does not currently offer a temporary SnowballPay pause. You can cancel now and return to Pro later.',
  },
  {
    value: 'plan_complete',
    label: 'My payoff plan is complete',
    guidance:
      'That is worth celebrating. You can continue to Stripe and cancel Pro without losing your SnowballPay account.',
  },
  {
    value: 'other',
    label: 'Another reason',
    guidance:
      'You can continue to Stripe without sharing more. Cancellation remains available either way.',
  },
] as const;
