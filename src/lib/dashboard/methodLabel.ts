import type { PayoffMethod } from '@/lib/snowball';

/** Display names for the payoff methods: one source for every v2 view model. */
export const METHOD_LABEL: Readonly<Record<PayoffMethod, string>> = {
  snowball: 'Snowball',
  avalanche: 'Avalanche',
  custom: 'Custom',
};
