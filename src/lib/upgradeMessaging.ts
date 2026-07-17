export const UPGRADE_MESSAGE_VERSION = 'contextual_v1';
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
    monthlyCta: 'Start my trial and add every debt',
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
    monthlyCta: 'Start my trial and connect accounts',
  },
  what_if: {
    id: 'what_if',
    headline: 'See which extra payment changes your debt-free date',
    description:
      'Pro what-if scenarios let you compare realistic payment changes before committing more of your monthly budget.',
    benefits: [
      'Compare $50 and $100 monthly increases',
      'See how many months each change saves',
      'Keep the original plan unchanged while exploring',
    ],
    monthlyCta: 'Start my trial and test scenarios',
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
    monthlyCta: 'Start my trial and unlock the coach',
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
    monthlyCta: 'Start my trial and open Intelligence',
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
    monthlyCta: 'Start my Pro trial',
  },
};

export function getUpgradeMessage(feature?: string): UpgradeMessage {
  const normalized = feature?.trim().toLowerCase() ?? '';

  if (normalized.includes('unlimited debt')) return MESSAGES.unlimited_debts;
  if (normalized.includes('bank sync')) return MESSAGES.bank_sync;
  if (normalized.includes('what-if')) return MESSAGES.what_if;
  if (normalized.includes('coach')) return MESSAGES.coach;
  if (normalized.includes('intelligence')) return MESSAGES.intelligence;
  return MESSAGES.general;
}

export function shouldShowLateTrialNotice(daysRemaining: number): boolean {
  return daysRemaining >= 0 && daysRemaining <= LATE_TRIAL_NOTICE_DAYS;
}
