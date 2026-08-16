export const UPGRADE_MESSAGE_VERSION = 'contextual_v3';
export const LATE_TRIAL_NOTICE_DAYS = 7;

export interface UpgradeMessage {
  id: string;
  headline: string;
  description: string;
  benefits: readonly [string, string, string];
  monthlyCta: string;
}

const MESSAGES: Record<string, UpgradeMessage> = {
  unlimited_debts: {
    id: 'unlimited_debts',
    headline: 'Bring every debt into one clear payoff order',
    description:
      'Free tracks up to five debts. Pro keeps the complete picture together so your next target and timeline stay useful.',
    benefits: [
      'Track every active debt in one plan',
      'Keep a complete payoff order and timeline',
      'Adjust priorities when your situation changes',
    ],
    monthlyCta: 'Upgrade and add every debt',
  },
  bank_sync: {
    id: 'bank_sync',
    headline: 'Keep balances current with less manual work',
    description:
      'Pro bank sync helps eligible accounts stay connected to the payoff plan while you remain in control of each update.',
    benefits: [
      'Connect eligible accounts through Plaid',
      'Refresh balances from the debt card',
      'Keep the payoff forecast based on current balances',
    ],
    monthlyCta: 'Upgrade and connect accounts',
  },
  what_if: {
    id: 'what_if',
    headline: 'Test payment changes before you commit to them',
    description:
      'Your acceleration slider sets the committed amount. Pro what-if scenarios let you preview changes side-by-side first — without touching the plan you are on.',
    benefits: [
      'Preview +$50 and +$100 scenarios side-by-side',
      'See months and interest saved before you commit',
      'Apply a winning scenario to your plan in one click',
    ],
    monthlyCta: 'Upgrade and test scenarios',
  },
  coach: {
    id: 'coach',
    headline: 'Know what to review and adjust each month',
    description:
      'Pro turns your saved payoff plan into an ongoing check-in with coach notes, forecasts, and practical next actions.',
    benefits: [
      'Receive plan-aware payoff coach notes',
      'Review risks and next actions in one place',
      'Adapt the plan when balances or cash flow change',
    ],
    monthlyCta: 'Upgrade and unlock the coach',
  },
  intelligence: {
    id: 'intelligence',
    headline: 'See where your payoff plan is headed',
    description:
      'Pro Intelligence shows the forecast, tradeoffs, and guardrails behind your plan so you can adjust with context.',
    benefits: [
      'Compare payoff strategies and forecasts',
      'Review cash-flow and buffer guardrails',
      'Track the plan against real progress',
    ],
    monthlyCta: 'Upgrade and open Intelligence',
  },
  acceleration: {
    id: 'acceleration',
    headline: 'Choose exactly how much extra goes to debt each month',
    description:
      'Your plan already uses your available cash flow. Pro lets you set the precise monthly amount applied to it — dial it up or down as life changes.',
    benefits: [
      'Set an exact acceleration amount each month',
      'Watch the payoff date move as you adjust it',
      'Change or clear the amount anytime',
    ],
    monthlyCta: 'Upgrade and set my pace',
  },
  custom_priority: {
    id: 'custom_priority',
    headline: 'Put your debts in the order that fits your life',
    description:
      'Snowball and avalanche are proven defaults. Pro custom ordering lets you rank debts your way when a co-signed loan, a family debt, or peace of mind matters more than the formula.',
    benefits: [
      'Rank debts in your own payoff order',
      'Keep the timeline and interest math accurate',
      'Switch back to snowball or avalanche anytime',
    ],
    monthlyCta: 'Upgrade and set my order',
  },
  export_plan: {
    id: 'export_plan',
    headline: 'Take your payoff plan where you already look',
    description:
      'Pro exports your plan beyond the app — due dates in your calendar so payment day is never a surprise.',
    benefits: [
      'Add every due date to your calendar',
      'Keep reminders in the tools you already check',
      'Re-export anytime as the plan changes',
    ],
    monthlyCta: 'Upgrade and export my plan',
  },
  trial_ended: {
    id: 'trial_ended',
    headline: 'Your free week of Pro just ended',
    description:
      'You had the full toolkit all week — coach notes, what-if scenarios, every debt in one plan. If it helped, keep it. Your debts and plan stay safe on Free either way.',
    benefits: [
      'Keep coach notes and monthly check-ins',
      'Keep what-if scenarios and forecasts',
      'Keep every debt in one payoff plan',
    ],
    monthlyCta: 'Keep Pro',
  },
  general: {
    id: 'general',
    headline: 'Keep your payoff plan working month after month',
    description:
      'Free builds the first plan. Pro adds the follow-through tools that help you review, adjust, and keep momentum.',
    benefits: [
      'Monthly payoff coach notes and next actions',
      'What-if scenarios and deeper forecasts',
      'Unlimited debts and complete payoff history',
    ],
    monthlyCta: 'Upgrade to Pro',
  },
};

export function getUpgradeMessage(feature?: string): UpgradeMessage {
  const normalized = feature?.trim().toLowerCase() ?? '';

  if (normalized.includes('unlimited debt')) return MESSAGES.unlimited_debts;
  if (normalized.includes('bank sync')) return MESSAGES.bank_sync;
  // Before 'what-if': legacy 'What-if slider' / 'Acceleration control'
  // feature strings map to the acceleration message, which describes
  // committing an amount, not the explore-only what-if scenarios. The
  // acceleration control itself is free for all tiers now, so these
  // strings only arrive from stale clients.
  if (normalized.includes('acceleration') || normalized.includes('slider'))
    return MESSAGES.acceleration;
  if (normalized.includes('what-if')) return MESSAGES.what_if;
  if (normalized.includes('coach')) return MESSAGES.coach;
  if (normalized.includes('intelligence')) return MESSAGES.intelligence;
  if (normalized.includes('trial ended')) return MESSAGES.trial_ended;
  if (normalized.includes('custom priority')) return MESSAGES.custom_priority;
  if (normalized.includes('export')) return MESSAGES.export_plan;
  return MESSAGES.general;
}

export function shouldShowLateTrialNotice(daysRemaining: number): boolean {
  return daysRemaining >= 0 && daysRemaining <= LATE_TRIAL_NOTICE_DAYS;
}
