import type { PayoffMethod } from '@/lib/snowball';
import type { Debt } from '@/types';

export type DebtRowSeed = {
  id: string;
  name: string;
  balance: string;
  rate: string;
  minimum: string;
};

export interface CalculatorContentSection {
  title: string;
  body: string;
}

export interface CalculatorConfig {
  slug: string;
  pageTitle: string;
  heroTitle: string;
  heroDescription: string;
  loadExampleLabel: string;
  debtCategory: Debt['category'];
  defaultMethod: PayoffMethod;
  seedDebts: DebtRowSeed[];
  defaultTakeHome: string;
  defaultEssential: string;
  defaultExtra: string;
  ctaLabel: string;
  ctaHelperText: string;
  contentIntroTitle: string;
  contentIntroBody: string;
  contentSections: CalculatorContentSection[];
}

export const defaultCalculatorConfig: CalculatorConfig = {
  slug: 'default',
  pageTitle: 'Free Debt Payoff Calculator',
  heroTitle: 'When will you be debt-free?',
  heroDescription:
    'Enter your debts and income below. See your exact payoff date, total interest, and how much faster snowball beats paying minimums - free, no account needed.',
  loadExampleLabel: 'Load Example Scenario',
  debtCategory: 'Credit Card',
  defaultMethod: 'snowball',
  seedDebts: [
    { id: '1', name: 'Credit Card', balance: '14200', rate: '24.99', minimum: '285' },
    { id: '2', name: 'Car Loan', balance: '4800', rate: '6.9', minimum: '145' },
    { id: '3', name: 'Student Loan', balance: '22500', rate: '5.2', minimum: '210' },
  ],
  defaultTakeHome: '5200',
  defaultEssential: '2400',
  defaultExtra: '200',
  ctaLabel: 'Save My Plan - It\'s Free',
  ctaHelperText: 'No credit card - Takes 30 seconds',
  contentIntroTitle: 'How to use this debt payoff calculator',
  contentIntroBody:
    'Everything you need to know about calculating your debt-free date and picking the right strategy.',
  contentSections: [
    {
      title: 'How does the debt snowball method work?',
      body:
        'The debt snowball method prioritizes paying off your smallest balance first, regardless of interest rate. You make minimum payments on all other debts and throw every extra dollar at the smallest one. When it is gone, that payment snowballs into the next smallest debt, creating momentum. Research shows the psychological wins from quick payoffs keep people on track longer than purely math-optimal approaches.',
    },
    {
      title: 'How does the debt avalanche method work?',
      body:
        'The debt avalanche targets the highest interest rate first. You still make minimums on everything else, but your extra payments attack the most expensive debt. This approach minimizes the total interest you pay over the life of your debts and is mathematically optimal, but it requires patience because the first payoff can take longer.',
    },
    {
      title: 'Why calculate your debt payoff date?',
      body:
        'Knowing your exact debt-free date transforms an abstract problem into a concrete goal. Seeing the date also helps you compare strategies - two months earlier might justify choosing avalanche over snowball, or vice versa.',
    },
    {
      title: 'What is the vs Minimums comparison?',
      body:
        'The vs Minimums figure shows how much interest you save compared to making only the minimum payment on every debt. Any extra payment you make directly attacks that number and compounds over time.',
    },
    {
      title: 'How accurate is this calculator?',
      body:
        'This calculator uses standard amortization math: it applies your interest rate monthly, subtracts your payment, and carries the remainder forward. Results assume a fixed interest rate and consistent monthly payment.',
    },
  ],
};

export const calculatorConfigs: Record<string, CalculatorConfig> = {
  'student-loan-payoff': {
    slug: 'student-loan-payoff',
    pageTitle: 'Student Loan Payoff Calculator',
    heroTitle: 'Student Loan Payoff Calculator',
    heroDescription:
      'Calculate your exact student loan payoff date, total interest, and how much faster extra payments get you to zero. Works for federal and private loans.',
    loadExampleLabel: 'Load Student Loan Example',
    debtCategory: 'Student Loan',
    defaultMethod: 'avalanche',
    seedDebts: [
      { id: '1', name: 'Federal Subsidized Loan', balance: '18500', rate: '5.50', minimum: '195' },
      { id: '2', name: 'Federal Unsubsidized Loan', balance: '8200', rate: '7.05', minimum: '95' },
    ],
    defaultTakeHome: '4800',
    defaultEssential: '2200',
    defaultExtra: '100',
    ctaLabel: 'Save My Student Loan Plan',
    ctaHelperText: 'Free account - track every payment and stay on plan',
    contentIntroTitle: 'How to use this student loan payoff calculator',
    contentIntroBody:
      'Enter your loan balances, interest rates, and monthly income to see your payoff date and compare strategies. Works for any federal or private loan.',
    contentSections: [
      {
        title: 'Federal vs private student loans',
        body:
          'Federal loans carry fixed rates set by Congress each year and come with income-driven repayment options. Private loans have variable or fixed rates set by lenders and fewer built-in protections. This calculator works for both, but your strategy may differ depending on the mix.',
      },
      {
        title: 'Why the avalanche method is usually best for student loans',
        body:
          'Student loan portfolios often include multiple loans at different rates. Avalanche directs extra payments to the highest-rate loan first, which tends to save the most interest when rates vary across a stack. Snowball is still worth modeling if one small loan is close to payoff and the psychological win matters to you.',
      },
      {
        title: 'How extra payments compound over time',
        body:
          'Even $50 extra per month reduces the principal faster, which lowers every subsequent month\'s interest charge. The compounding effect means small increases in payment early in the loan term save disproportionately large amounts of interest over the full term.',
      },
      {
        title: 'When to consider income-driven repayment instead',
        body:
          'If your federal loan balance is large relative to your income, income-driven repayment can cap monthly payments and potentially qualify you for forgiveness after 20-25 years. This calculator models aggressive payoff, which saves the most total interest but assumes you can maintain the payment.',
      },
      {
        title: 'Refinancing and this calculator',
        body:
          'If you refinance federal loans into a private loan, you lose access to income-driven plans and forgiveness programs. Before entering a refinanced rate here, weigh whether the lower rate is worth giving up those protections.',
      },
    ],
  },
  'auto-loan-payoff': {
    slug: 'auto-loan-payoff',
    pageTitle: 'Auto Loan Payoff Calculator',
    heroTitle: 'Auto Loan Payoff Calculator',
    heroDescription:
      'See how quickly you can pay off your car loan and how much interest you save with extra payments. Enter your balance, rate, and payment to get an exact payoff date.',
    loadExampleLabel: 'Load Auto Loan Example',
    debtCategory: 'Auto Loan',
    defaultMethod: 'snowball',
    seedDebts: [
      { id: '1', name: 'Car Loan', balance: '14800', rate: '7.4', minimum: '310' },
    ],
    defaultTakeHome: '5000',
    defaultEssential: '2600',
    defaultExtra: '100',
    ctaLabel: 'Save My Car Loan Plan',
    ctaHelperText: 'Free account - track real payoff progress',
    contentIntroTitle: 'How to use this auto loan payoff calculator',
    contentIntroBody:
      'Enter your current car loan balance, APR, and monthly payment to see your debt-free date and how extra payments shorten the loan.',
    contentSections: [
      {
        title: 'How auto loan interest is calculated',
        body:
          'Auto loans use simple interest that accrues daily on the outstanding principal. Each monthly payment covers the interest that has accrued since the last payment, with the remainder reducing the principal. Extra payments reduce the principal immediately, which lowers every subsequent interest charge.',
      },
      {
        title: 'Why paying extra early matters most',
        body:
          'Because interest accrues on the remaining balance, early extra payments save more than the same amount paid later. Adding even $50 to the first year of a 60-month loan can shave two to three months off the total term.',
      },
      {
        title: 'Negative equity and payoff order',
        body:
          'If you owe more than your car is worth, you are carrying negative equity. Paying off the loan faster eliminates this gap sooner and reduces the insurance risk of a total loss. If you have credit card debt at a higher rate, this calculator can also model which debt to attack first.',
      },
      {
        title: 'Refinancing your auto loan',
        body:
          'If rates have dropped or your credit has improved since you bought the car, refinancing can lower your rate and reduce total interest. Enter the new rate here to see the before-and-after comparison on payoff date and total cost.',
      },
      {
        title: 'Snowball vs avalanche for auto loans',
        body:
          'Auto loans usually carry a lower rate than credit cards, so if you have both types of debt, avalanche would direct extra payments to credit cards first. Use this calculator alongside the credit card payoff calculator to see the full picture.',
      },
    ],
  },
  'personal-loan-payoff': {
    slug: 'personal-loan-payoff',
    pageTitle: 'Personal Loan Payoff Calculator',
    heroTitle: 'Personal Loan Payoff Calculator',
    heroDescription:
      'Calculate your personal loan payoff date and total interest. See how extra payments shorten the term and how your loan compares against higher-rate debts.',
    loadExampleLabel: 'Load Personal Loan Example',
    debtCategory: 'Personal Loan',
    defaultMethod: 'avalanche',
    seedDebts: [
      { id: '1', name: 'Personal Loan', balance: '9500', rate: '14.5', minimum: '225' },
    ],
    defaultTakeHome: '4800',
    defaultEssential: '2300',
    defaultExtra: '100',
    ctaLabel: 'Save My Loan Plan',
    ctaHelperText: 'Free account - track payments and stay on schedule',
    contentIntroTitle: 'How to use this personal loan payoff calculator',
    contentIntroBody:
      'Enter your loan balance, interest rate, and monthly payment to calculate your payoff timeline and see how extra payments reduce total interest.',
    contentSections: [
      {
        title: 'How personal loan interest works',
        body:
          'Most personal loans use simple interest on a fixed term, so your monthly payment and payoff date are set at origination. Extra payments reduce the principal directly, which shortens the remaining term or reduces future interest - check your lender\'s terms for how they apply overpayments.',
      },
      {
        title: 'Personal loans vs credit cards',
        body:
          'Personal loans typically carry a lower rate than credit cards and have a fixed end date, which makes budgeting easier. If you used a personal loan to consolidate credit card debt, this calculator shows whether you are ahead of the original payoff date.',
      },
      {
        title: 'When avalanche makes sense for personal loans',
        body:
          'If your personal loan rate is higher than your other debts, avalanche directs extra dollars here first. If your loan rate is lower than your credit cards, credit cards should take priority and you should model the personal loan alongside them.',
      },
      {
        title: 'Prepayment penalties',
        body:
          'Some personal loans include prepayment penalties if you pay off early. Review your loan agreement before aggressively adding extra payments. Many lenders eliminated these fees, but it is worth confirming before running an extra-payment strategy.',
      },
      {
        title: 'Using a personal loan to consolidate debt',
        body:
          'Consolidating multiple high-rate debts into one personal loan at a lower rate can reduce total interest and simplify repayment. After consolidating, use this calculator to keep the payoff momentum going instead of treating the consolidated loan like a clean slate.',
      },
    ],
  },
  'credit-card-payoff': {
    slug: 'credit-card-payoff',
    pageTitle: 'Credit Card Payoff Calculator',
    heroTitle: 'Credit Card Payoff Calculator',
    heroDescription:
      'Calculate how long it will take to pay off credit card debt. See your debt-free date, compare minimums vs extra payments, and estimate how much interest you can avoid.',
    loadExampleLabel: 'Load Credit Card Example',
    debtCategory: 'Credit Card',
    defaultMethod: 'snowball',
    seedDebts: [
      { id: '1', name: 'Primary Credit Card', balance: '8000', rate: '24.99', minimum: '240' },
    ],
    defaultTakeHome: '5200',
    defaultEssential: '2400',
    defaultExtra: '150',
    ctaLabel: 'Save My Credit Card Plan',
    ctaHelperText: 'Free account - track real balances and payments',
    contentIntroTitle: 'How to use this credit card payoff calculator',
    contentIntroBody:
      'Use this calculator to estimate your debt-free date, compare minimum payments against extra payments, and see how much credit card interest is costing you.',
    contentSections: [
      {
        title: 'How credit card interest slows payoff',
        body:
          'Credit cards usually carry the highest APR in a debt stack, which means a large share of each payment disappears into interest. That is why credit card balances can feel stuck even when you pay every month.',
      },
      {
        title: 'What happens if you only pay the minimum',
        body:
          'Minimum payments are designed to stretch repayment over a long period. On a high-APR card, only a small portion of your payment reduces principal in the early months, which is why payoff can take years longer than people expect.',
      },
      {
        title: 'How much faster extra payments work',
        body:
          'Every dollar above the minimum goes straight to principal. That reduces next month\'s interest charge, which accelerates the payoff curve and compounds over time.',
      },
      {
        title: 'Snowball vs avalanche for credit cards',
        body:
          'If you are focused on motivation, snowball can help you close smaller balances quickly. If your credit card APR is the biggest pain point, avalanche usually saves the most interest. This calculator lets you compare both paths before you commit.',
      },
      {
        title: 'Why utilization matters too',
        body:
          'Paying down revolving balances does more than reduce interest. It also lowers credit utilization, which can improve your credit profile over time. That makes credit cards the best first SEO wedge for SnowballPay because the payoff story is both financial and behavioral.',
      },
    ],
  },
};

export function getCalculatorConfig(slug: string): CalculatorConfig | null {
  return calculatorConfigs[slug] ?? null;
}
