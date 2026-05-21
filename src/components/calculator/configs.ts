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

export interface FAQItem {
  question: string;
  answer: string;
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
  introTitle: string;
  introBody: string;
  contentIntroTitle: string;
  contentIntroBody: string;
  contentSections: CalculatorContentSection[];
  faqItems: FAQItem[];
  relatedCalculators: Array<{ slug: string; title: string }>;
}

export const defaultCalculatorConfig: CalculatorConfig = {
  slug: 'default',
  pageTitle: 'Free Debt Payoff Calculator',
  heroTitle: 'When will you be debt-free?',
  heroDescription:
    'Enter your debts and income below. See your projected payoff date, total interest, and how much faster snowball beats paying minimums - free, no account needed.',
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
  ctaLabel: 'Save This Plan and Track Progress',
  ctaHelperText: 'Free account - no card required',
  introTitle: 'Free Debt Payoff Calculator for Any Debt Type',
  introBody:
    'Carrying multiple types of debt? This free calculator shows your projected debt-free date—whether you have credit cards, student loans, car loans, or personal loans. Enter your balances and monthly budget, then compare the Snowball vs Avalanche strategies to see which plan fits your goals and cash flow. The U.S. household debt average exceeds $145,000, but most people have no idea how long they\'ll carry it or how much interest they\'ll pay. This calculator changes that. See your personalized debt-free forecast in seconds, no account required.',
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
        'Knowing your projected debt-free date transforms an abstract problem into a concrete goal. Seeing the date also helps you compare strategies - two months earlier might justify choosing avalanche over snowball, or vice versa.',
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
  faqItems: [
    {
      question: 'How long will it take to pay off my debt?',
      answer:
        'Enter your balances, interest rates, and monthly income into this calculator to get your projected payoff date. The result depends on how much extra you can pay beyond minimums—even $50 extra per month can shorten your timeline by years.',
    },
    {
      question: 'What is the difference between Snowball and Avalanche?',
      answer:
        'Snowball pays off smallest balances first for quick psychological wins. Avalanche targets highest-rate debt first to minimize total interest paid. Use this calculator to compare both strategies side by side.',
    },
    {
      question: 'Is it better to pay off one debt at a time or all together?',
      answer:
        'This calculator models paying minimums on everything while directing extra money to one debt at a time (either smallest balance or highest rate). This approach accelerates payoff faster than spreading extra payments thin.',
    },
    {
      question: 'How much interest will I pay if I only make minimum payments?',
      answer:
        'This calculator shows the difference between your payoff plan and paying only minimums. The gap can be large, which is why sustainable extra payments, even small ones, matter so much.',
    },
    {
      question: 'Can I change my strategy mid-way through my payoff plan?',
      answer:
        'Absolutely. You can switch from Snowball to Avalanche (or vice versa) at any time. This calculator lets you model different strategies to see which feels right for your situation.',
    },
    {
      question: 'What if I can\'t afford extra payments right now?',
      answer:
        'Even $10–25 extra per month helps. If your budget is tight, focus on avoiding new debt and making consistent minimum payments. As your income grows, redirect that increase toward debt payoff.',
    },
  ],
  relatedCalculators: [
    { slug: 'credit-card-payoff', title: 'Credit Card Payoff Calculator' },
    { slug: 'student-loan-payoff', title: 'Student Loan Payoff Calculator' },
    { slug: 'auto-loan-payoff', title: 'Auto Loan Payoff Calculator' },
    { slug: 'personal-loan-payoff', title: 'Personal Loan Payoff Calculator' },
  ],
};

export const calculatorConfigs: Record<string, CalculatorConfig> = {
  'student-loan-payoff': {
    slug: 'student-loan-payoff',
    pageTitle: 'Student Loan Payoff Calculator | Know Your Graduation Date',
    heroTitle: 'Student Loan Payoff Calculator',
    heroDescription:
      'Calculate your projected student loan payoff date and see how extra payments may change the timeline. Compare federal vs private loan strategies and discover a realistic path to zero.',
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
    ctaLabel: 'Save This Student Loan Plan',
    ctaHelperText: 'Free account - track payments and payoff changes',
    introTitle: 'How to Pay Off Student Loans Faster',
    introBody:
      'U.S. student loan debt exceeds $1.7 trillion, with the average graduate owing $28,000. Whether you have federal or private loans, this free calculator shows your projected loan-free date—and how much interest you\'ll pay along the way. Many borrowers don\'t realize they could be free years earlier by directing extra payments strategically. This student loan payoff calculator models both federal and private loans, compares repayment strategies, and shows how extra payments may compound. Enter your loan details and monthly budget to discover your projected debt-free date.',
    contentIntroTitle: 'How to use this student loan payoff calculator',
    contentIntroBody:
      'Enter your federal and private loan balances, interest rates, and monthly income to see your projected payoff date and compare strategies. This calculator works for any combination of loan types.',
    contentSections: [
      {
        title: 'Federal vs private student loans—key differences',
        body:
          'Federal loans carry interest rates set by Congress each year (currently ranging from 5% to 8% depending on loan type) and come with income-driven repayment options, deferment, forbearance, and potential loan forgiveness programs. Private loans have interest rates set by lenders based on your credit and can be either fixed or variable. Federal loans offer significantly more protections and flexibility if your financial situation changes. Private loans typically have fewer options if you hit hardship. Understanding which loans you have is essential to choosing the right payoff strategy. This calculator handles both types, but your approach may differ based on the mix.',
      },
      {
        title: 'Federal student loan types and their rates',
        body:
          'Direct Subsidized Loans (the government pays interest while you\'re in school) and Direct Unsubsidized Loans (interest accrues immediately) are the two primary federal options for undergraduate students. Graduate students can also take out PLUS loans at higher rates. Each type has the same fixed rate within a given academic year, set by Congress. Federal rates do not vary based on credit score. Understanding which type you have helps you predict payoff timelines accurately. You can find your loan types on StudentAid.gov or in your loan servicer\'s online portal.',
      },
      {
        title: 'Why the avalanche method usually saves the most on student loans',
        body:
          'Student loan portfolios often include multiple loans at different rates (for example, 5% federal, 7% federal, and 8% private). The avalanche method directs all extra payments to the highest-rate loan first, which mathematically minimizes total interest paid. On a portfolio with $30,000 in federal loans at 5–7% and $10,000 in private loans at 8%, avalanche saves thousands in interest versus snowball. However, snowball (paying smallest balance first) can work if you\'re motivated by quick wins and willing to accept higher total interest in exchange for psychological momentum. This calculator lets you model both to decide which suits your temperament and goals.',
      },
      {
        title: 'Income-driven repayment and when to choose it over aggressive payoff',
        body:
          'If your federal loan balance is large relative to your income (a common scenario for doctors, lawyers, and other highly educated borrowers), income-driven repayment (IDR) plans can cap your monthly payment at a percentage of your discretionary income—often allowing payments as low as $0 if income is very low. After 20–25 years, any remaining balance may be forgiven. This calculator models aggressive payoff, which saves the most total interest but assumes you can maintain the payment. IDR might make sense if your current payment would consume more than 10% of your gross income. Compare: aggressive payoff savings vs. IDR monthly relief, and consult a tax professional about the tax implications of forgiveness.',
      },
      {
        title: 'How extra payments compound over time on federal loans',
        body:
          'Even $50 extra per month reduces the principal faster, which lowers every subsequent month\'s interest charge. On a $25,000 federal loan at 6.5%, paying $300/month instead of $250/month shortens payoff from 95 months to 81 months—saving roughly $1,000 in interest. The earlier you make extra payments, the more you save, because future interest is calculated on a smaller principal. This is why paying extra early in your career (when you\'re motivated and inflation hasn\'t yet made dollars smaller) is so powerful. If you receive a bonus, gift, or tax refund, a single extra payment can shave months off your timeline.',
      },
      {
        title: 'Refinancing federal loans and what you give up',
        body:
          'Refinancing federal loans into a private loan offers a lower interest rate, but you lose access to federal protections: income-driven repayment, deferment, forbearance, and potential forgiveness. Before refinancing, ask yourself: do I plan to aggressively pay off this loan? Is my income stable? If the answer is yes, refinancing might save significant interest. If you\'re concerned about income volatility or job loss, federal protections are worth the higher rate. Many financial advisors recommend keeping at least some federal loans unrefined for safety.',
      },
      {
        title: 'Public Service Loan Forgiveness (PSLF) and strategic payoff',
        body:
          'If you work for a government or nonprofit employer, Public Service Loan Forgiveness can forgive federal loans after 10 years of qualifying payments (120 payments). If you\'re on track for PSLF, aggressive payoff may not make sense—you\'d be paying off loans that would be forgiven anyway. Instead, use income-driven repayment to minimize payments and let the clock run. This calculator models aggressive payoff; if PSLF applies to you, reconsider this strategy against the forgiveness timeline.',
      },
      {
        title: 'Student loan interest deduction and tax planning',
        body:
          'The IRS allows a deduction of up to $2,500 in student loan interest paid per year (phase-out starts at higher incomes). This effectively lowers your after-tax cost of the loan. When calculating true payoff costs, account for this deduction if you qualify. The longer you carry the loan, the more interest you deduct. Aggressive payoff means higher taxes (less deduction), which is another reason to consider whether fast payoff aligns with your tax situation.',
      },
      {
        title: 'Mixing federal and private loan payoff strategy',
        body:
          'If you have both federal and private loans, this calculator can model them together. A common strategy is to aggressively pay down private loans (no protections to lose) while keeping federal loans on a manageable plan (to preserve deferment options). Another approach is to hit the highest-rate loan first (usually private) and then redirect payments to federal loans. Experiment with the calculator to see which feels right for your situation.',
      },
      {
        title: 'Comparing student loans to other debt types',
        body:
          'Student loans typically carry lower rates than <a href="/calculators/credit-card-payoff" style="color: #2563eb; text-decoration: underline;">credit cards</a>, similar rates to <a href="/calculators/auto-loan-payoff" style="color: #2563eb; text-decoration: underline;">auto loans</a>, and sometimes lower rates than <a href="/calculators/personal-loan-payoff" style="color: #2563eb; text-decoration: underline;">personal loans</a>. If you have a debt mix, the avalanche method directs extra payments to highest-rate debt first. This calculator focuses on student loans, but consider modeling your full debt picture to prioritize payments effectively.',
      },
      {
        title: 'How to stay motivated on a long student loan payoff timeline',
        body:
          'If your total balance is high or you\'re paying slowly, your payoff timeline might be 10+ years. Motivation is critical to avoid giving up or missing payments. Set milestones: celebrate when you hit 50% payoff, then 75%. Redirect freed-up money from paid-off loans into higher-rate loans. Track progress with a tool like SnowballPay to see your debt-free date get closer each month. Long timelines are demoralizing without visibility.',
      },
      {
        title: 'Common student loan payoff mistakes to avoid',
        body:
          'The biggest mistake is ignoring federal protections and refinancing too aggressively. Another is missing the fact that interest is compounding—waiting to pay extra \'later\' costs far more than paying extra now. Some borrowers get stuck in income-driven repayment indefinitely without questioning whether payoff would be faster. Finally, many don\'t track progress at all, so they have no idea when they\'ll be free. Use this calculator to set a realistic goal and monitor actual progress against it.',
      },
    ],
    faqItems: [
      {
        question: 'How to pay off student loans faster',
        answer:
          'Focus extra payments on highest-interest loans first (Avalanche method), even if smaller loans are closer to payoff. Every dollar above minimums reduces principal, lowering subsequent interest charges. Even $25–50 extra per month shortens your timeline by years.',
      },
      {
        question: 'Federal student loan payoff calculator',
        answer:
          'This calculator models federal loans (Subsidized, Unsubsidized, and PLUS), which carry fixed rates set by Congress. Enter your loan balances and current rates from StudentAid.gov to see your payoff timeline.',
      },
      {
        question: 'How long does it take to pay off student loans',
        answer:
          'Standard repayment is 10 years; income-driven plans extend to 20–25 years. Aggressive payoff with extra payments can cut this in half or more. Use this calculator with your actual financial details to find your timeline.',
      },
      {
        question: 'Should I refinance or pay off my student loans',
        answer:
          'Refinancing federal loans to private status lowers rates but removes income-driven repayment and forgiveness options. Only refinance if you\'re committed to aggressive payoff and don\'t fear job loss.',
      },
      {
        question: 'Is paying off student loans worth it vs investing',
        answer:
          'On interest rate alone, paying off 5%–7% student loans is mathematically similar to investing. However, debt certainty and psychology often make payoff the better choice early in your career.',
      },
      {
        question: 'What is Public Service Loan Forgiveness',
        answer:
          'PSLF forgives remaining federal loan balances after 10 years (120 qualifying payments) if you work for a government or nonprofit employer. If eligible, you may want to minimize payments instead of aggressively paying off.',
      },
    ],
    relatedCalculators: [
      { slug: 'credit-card-payoff', title: 'Credit Card Payoff Calculator' },
      { slug: 'auto-loan-payoff', title: 'Auto Loan Payoff Calculator' },
      { slug: 'personal-loan-payoff', title: 'Personal Loan Payoff Calculator' },
    ],
  },
  'auto-loan-payoff': {
    slug: 'auto-loan-payoff',
    pageTitle: 'Auto Loan Payoff Calculator | Pay Off Your Car Loan Early',
    heroTitle: 'Auto Loan Payoff Calculator',
    heroDescription:
      'See how quickly you can pay off your car loan and how much interest you save with extra payments. Enter your balance, rate, and payment to get a projected payoff date.',
    loadExampleLabel: 'Load Auto Loan Example',
    debtCategory: 'Auto Loan',
    defaultMethod: 'snowball',
    seedDebts: [
      { id: '1', name: 'Car Loan', balance: '14800', rate: '7.4', minimum: '310' },
      { id: '2', name: 'Personal Car Loan', balance: '3200', rate: '5.9', minimum: '95' },
    ],
    defaultTakeHome: '5000',
    defaultEssential: '2600',
    defaultExtra: '100',
    ctaLabel: 'Save This Car Loan Plan',
    ctaHelperText: 'Free account - track real payoff progress',
    introTitle: 'How to Pay Off Your Car Loan Early',
    introBody:
      'The average auto loan runs 60–84 months at 5%–8% interest, meaning most drivers spend 5–7 years paying for their car. Many don\'t realize how much interest they\'re paying or how quickly extra payments can cut years off the loan. This free auto loan payoff calculator shows your projected payoff month—and how much interest you may save by paying extra. Whether you\'re carrying negative equity or want to eliminate a car payment faster, this calculator helps you model a realistic path to ownership.',
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
    faqItems: [
      {
        question: 'How long will it take to pay off my car loan?',
        answer:
          'Standard auto loans run 60–84 months. Adding extra payments can cut this significantly. Use this calculator to enter your balance, APR, and planned payment to see your projected payoff date.',
      },
      {
        question: 'How much interest will I pay on an auto loan?',
        answer:
          'Interest depends on your principal, APR, and loan term. A $20,000 loan at 6% over 60 months costs about $3,150 in interest. This calculator shows the estimated amount plus how much you save with extra payments.',
      },
      {
        question: 'Can I pay off my car loan early without penalty?',
        answer:
          'Most auto loans have no prepayment penalty. You can pay extra toward principal without restriction. Check your loan documents or call your lender to confirm.',
      },
      {
        question: 'How much will I save by paying off my car loan early?',
        answer:
          'Every month you shorten your loan saves the interest you would have paid in those months. On a $20,000 loan at 6%, paying 12 months early saves roughly $650 in interest.',
      },
      {
        question: 'Should I refinance my car loan?',
        answer:
          'Refinancing makes sense if rates have dropped or your credit improved. Use this calculator to compare your current rate vs. a new rate to see the savings potential.',
      },
      {
        question: 'What if my car is worth less than what I owe',
        answer:
          'This is called negative equity. Paying off the loan faster reduces this gap sooner and lowers your insurance risk. This calculator helps you model aggressive payoff to escape negative equity faster.',
      },
    ],
    relatedCalculators: [
      { slug: 'credit-card-payoff', title: 'Credit Card Payoff Calculator' },
      { slug: 'student-loan-payoff', title: 'Student Loan Payoff Calculator' },
      { slug: 'personal-loan-payoff', title: 'Personal Loan Payoff Calculator' },
    ],
  },
  'personal-loan-payoff': {
    slug: 'personal-loan-payoff',
    pageTitle: 'Personal Loan Payoff Calculator | Early Payoff Savings',
    heroTitle: 'Personal Loan Payoff Calculator',
    heroDescription:
      'Calculate your personal loan payoff date and total interest. See how extra payments shorten the term and how your loan compares against higher-rate debts.',
    loadExampleLabel: 'Load Personal Loan Example',
    debtCategory: 'Personal Loan',
    defaultMethod: 'avalanche',
    seedDebts: [
      { id: '1', name: 'Personal Loan', balance: '9500', rate: '14.5', minimum: '225' },
      { id: '2', name: 'Consolidation Loan', balance: '4200', rate: '11.9', minimum: '110' },
    ],
    defaultTakeHome: '4800',
    defaultEssential: '2300',
    defaultExtra: '100',
    ctaLabel: 'Save This Loan Plan',
    ctaHelperText: 'Free account - track payments and payoff changes',
    introTitle: 'Calculate Your Personal Loan Payoff Date',
    introBody:
      'Personal loans offer fixed rates and predictable payment schedules, making them popular for consolidating debt or funding large expenses. But many borrowers never calculate whether they could pay off faster with extra payments—or how much interest that would save. This free personal loan payoff calculator shows your projected debt-free date and reveals how much early payoff costs vs. keeping your current schedule. Whether you received a bonus, windfall, or simply want to understand your financial timeline, this tool helps you model the impact of extra payments.',
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
    faqItems: [
      {
        question: 'How to pay off personal loan early',
        answer:
          'Make extra payments toward principal whenever possible. Even $25–50 extra per month shortens your timeline and saves interest. This calculator shows the projected impact of different payment amounts.',
      },
      {
        question: 'How long will it take to pay off a personal loan',
        answer:
          'Personal loans typically run 2–7 years. Enter your specific balance, rate, and payment into this calculator to see your projected payoff date. Extra payments can cut this significantly.',
      },
      {
        question: 'Can I pay off my personal loan early without penalty',
        answer:
          'Most personal loans have no prepayment penalty. Check your loan agreement or call your lender to confirm you can pay extra without fees.',
      },
      {
        question: 'How much interest will I pay on a personal loan',
        answer:
          'Interest depends on your principal, rate, and term. A $10,000 loan at 10% over 5 years costs roughly $2,748 in interest. This calculator shows your estimated amount and savings from early payoff.',
      },
      {
        question: 'Should I consolidate multiple debts into one personal loan',
        answer:
          'Consolidation makes sense if the new loan rate is lower than your current debts and you commit to paying extra instead of accumulating new debt. Calculate the total interest cost before and after consolidation.',
      },
      {
        question: 'What if I have prepayment penalties on my personal loan',
        answer:
          'Some lenders charge prepayment penalties (typically 1–5% of remaining balance). Calculate whether the interest you\'d save by early payoff exceeds the penalty cost before committing to accelerated payments.',
      },
    ],
    relatedCalculators: [
      { slug: 'credit-card-payoff', title: 'Credit Card Payoff Calculator' },
      { slug: 'student-loan-payoff', title: 'Student Loan Payoff Calculator' },
      { slug: 'auto-loan-payoff', title: 'Auto Loan Payoff Calculator' },
    ],
  },
  'credit-card-payoff': {
    slug: 'credit-card-payoff',
    pageTitle: 'Credit Card Payoff Calculator | Find Your Debt-Free Date',
    heroTitle: 'Credit Card Payoff Calculator',
    heroDescription:
      'Discover your projected debt-free date and see how much interest you\'ll pay. Compare Snowball vs Avalanche strategies and find a realistic path to zero.',
    loadExampleLabel: 'Load Credit Card Example',
    debtCategory: 'Credit Card',
    defaultMethod: 'snowball',
    seedDebts: [
      { id: '1', name: 'Primary Credit Card', balance: '8000', rate: '24.99', minimum: '240' },
      { id: '2', name: 'Secondary Card', balance: '2500', rate: '21.50', minimum: '75' },
    ],
    defaultTakeHome: '5200',
    defaultEssential: '2400',
    defaultExtra: '150',
    ctaLabel: 'Save This Credit Card Plan',
    ctaHelperText: 'Free account - track real balances and payments',
    introTitle: 'How Long Will It Take to Pay Off Credit Card Debt?',
    introBody:
      'The average American household carries $38,000 in credit card debt across multiple cards. At 24% APR, many people spend years paying off balances while more than half their payment goes to interest. This free credit card payoff calculator shows your projected debt-free date—and how much interest you may save by paying extra. Enter your card balance, APR, and monthly budget to see your debt-free date, compare the Snowball vs Avalanche methods, and discover how extra payments can move the plan forward.',
    contentIntroTitle: 'How to use this credit card payoff calculator',
    contentIntroBody:
      'Use this calculator to estimate your debt-free date, compare minimum payments against extra payments, and see how much credit card interest may cost you. Enter your card details and monthly budget to get started.',
    contentSections: [
      {
        title: 'How credit card interest slows payoff',
        body:
          'Credit cards usually carry the highest APR in a debt stack, which means a large share of each payment disappears into interest rather than reducing your balance. That is why credit card balances can feel stuck even when you pay every month. The average credit card APR is now above 20%, and some cards charge 25% or higher. On a $5,000 balance at 24.99%, paying only the minimum $150/month means roughly $100 goes to interest in month one—only $50 chips away at your actual debt. This is why it\'s critical to understand how much interest you\'re actually paying and how extra payments compound over time to accelerate your payoff.',
      },
      {
        title: 'What happens if you only pay the minimum',
        body:
          'Minimum payments are designed by credit card companies to stretch repayment over a very long period, which maximizes the total interest they collect. On a high-APR card, only a small portion of your payment reduces principal in the early months, which is why payoff can take years longer than people expect. For example, a $10,000 balance at 25% APR with a minimum payment of $300/month could take over 5 years to pay off, and you\'d pay more than $7,500 in interest. The credit card company isn\'t penalizing you—they\'re simply collecting interest. If you only pay minimums, you\'re essentially giving the card issuer a long, profitable loan at your expense.',
      },
      {
        title: 'How much faster extra payments work',
        body:
          'Every dollar above the minimum goes straight to principal. That reduces next month\'s interest charge, which accelerates the payoff curve and compounds over time. Even $50 extra per month can make a meaningful difference when the cash buffer supports it. Using the same $10,000 example at 25% APR: paying $350/month instead of $300/month shortens your payoff from 60+ months to roughly 38 months, saving you nearly $2,000 in interest. The earlier you make extra payments, the more you save, because you\'re reducing the principal that future interest is calculated on.',
      },
      {
        title: 'Snowball vs avalanche for credit cards',
        body:
          'If you are focused on motivation and momentum, the snowball method can help you close smaller balances quickly, giving you psychological wins that keep you committed. If your credit card APR is the biggest pain point in your debt stack and you want to minimize total interest paid, the avalanche method usually saves the most money. This calculator lets you compare both paths side by side before you commit to a strategy. Many people find that a hybrid approach works best: use avalanche for the math-optimal payoff, but track psychological milestones to stay motivated.',
      },
      {
        title: 'Understanding credit card APR and daily periodic rate',
        body:
          'Credit card APR is broken into a daily periodic rate (DPR), and interest compounds daily on your average daily balance. Most cards update interest daily, which means small additional payments early in a billing cycle reduce subsequent days\' interest charges. Understanding this dynamic helps explain why paying extra early in a cycle is more effective than paying at the end. It\'s also why paying down a balance slowly but steadily is more effective than a single lump-sum payment at the end of months, even though the total payment amount is the same.',
      },
      {
        title: 'Why utilization matters beyond payoff speed',
        body:
          'Paying down revolving balances does more than reduce interest—it also lowers your credit utilization ratio, which impacts your credit score. Credit utilization (the percentage of your available credit you\'re using) typically accounts for 30% of your credit score. Paying down a $10,000 balance on a $15,000 card improves your score more than paying off the same amount on a maxed-out card. This means that aggressive credit card payoff has two financial benefits: you save on interest and you improve your credit profile over time, which can lower rates on future borrowing.',
      },
      {
        title: 'How to find room in your budget for extra payments',
        body:
          'If minimum payments are all you can afford right now, that\'s okay—but this calculator can help you find even small amounts of extra cash. Look for subscriptions you\'ve forgotten about, dining-out costs, or entertainment spending. Even $25 extra per month can move your payoff date when it fits your budget. Some people use windfalls (tax refunds, bonuses, gifts) to make one large extra payment per year, which can also reduce future interest. The key is finding a sustainable extra amount you can maintain consistently.',
      },
      {
        title: 'Should you consolidate multiple credit cards',
        body:
          'If you have multiple credit cards at different rates, this calculator can model them all together. Consolidating cards into a single lower-rate personal loan or balance transfer card can reduce total interest, but make sure to factor in any balance transfer fees (typically 3–5%) and the new APR. A balance transfer card at 0% for 12 months might make sense if you can aggressively pay down the balance before the promotional rate ends. Use this calculator to compare: what you\'ll pay on your current cards vs. the cost of consolidation plus the resulting payoff timeline.',
      },
      {
        title: 'Comparing credit cards to other high-interest debt',
        body:
          'Credit cards often carry higher interest rates than <a href="/calculators/auto-loan-payoff" style="color: #2563eb; text-decoration: underline;">auto loans</a>, <a href="/calculators/student-loan-payoff" style="color: #2563eb; text-decoration: underline;">student loans</a>, or even <a href="/calculators/personal-loan-payoff" style="color: #2563eb; text-decoration: underline;">personal loans</a>. If you have a mix of debt types, the avalanche method directs extra payments to credit cards first. This calculator focuses on credit cards, but you can also model the full picture by adding other debt types to see your complete payoff strategy.',
      },
      {
        title: 'What to do when you pay off a credit card',
        body:
          'Once you pay off a credit card, you have a choice: close the account or leave it open with a zero balance. Closing it lowers your available credit and can temporarily hurt your credit score. Leaving it open keeps your utilization low (0% on that card) and maintains your credit history length, which is beneficial. If you decide to keep the card open, avoid carrying a balance again by using it only for small, planned purchases you pay off monthly. This keeps the benefits while preventing backsliding.',
      },
      {
        title: 'Common mistakes people make with credit card payoff',
        body:
          'The biggest mistake is using freed-up credit to spend more. Once you pay off a card, don\'t immediately increase your spending or you\'ll end up right back where you started. Another mistake is not tracking progress—seeing your payoff date and watching it get closer is motivating and helps you stick to the plan. Finally, some people pay down cards while still accumulating new credit card debt. If you can\'t stop the spending, fixing the minimum-payment habit alone won\'t help you reach your debt-free date.',
      },
      {
        title: 'Using this calculator with a debt payoff app',
        body:
          'This free calculator helps you model and compare strategies. Once you\'ve decided on a plan, consider saving it in a tracking app to monitor actual progress against your forecast. SnowballPay lets you save your plan for free, track real payments, and see how you\'re tracking against your calculated debt-free date. Seeing real progress compounds the motivation from having a concrete goal in the first place.',
      },
    ],
    faqItems: [
      {
        question: 'How long will it take to pay off my credit card?',
        answer:
          'It depends on your balance, APR, and monthly payment. Enter your details into this calculator to see your projected debt-free date. Paying the minimum could take 5+ years; adding extra payments can cut that in half.',
      },
      {
        question: 'How much interest will I pay on my credit card balance?',
        answer:
          'Interest owed = (balance × APR / 12) per month, applied to the remaining balance. Higher APRs mean more interest. This calculator estimates the total, plus how much you may save by paying extra.',
      },
      {
        question: 'Should I use the Snowball or Avalanche method on credit card debt?',
        answer:
          'Snowball pays smallest balance first for quick wins and motivation. Avalanche targets highest APR first to save the most interest. This calculator lets you compare both to decide which works for you.',
      },
      {
        question: 'Is it better to pay off credit cards or save?',
        answer:
          'High-interest credit card debt (20%+ APR) usually warrants aggressive payoff over saving, since the interest you save exceeds typical investment returns. Balance emergency savings ($1,000–2,000) with debt payoff.',
      },
      {
        question: 'What is a realistic way to pay off credit card debt faster?',
        answer:
          'Avalanche targets the highest APR first, which usually lowers interest cost. Pair it with the largest sustainable extra payment your budget can handle after essentials, minimums, and a cash buffer.',
      },
      {
        question: 'Will paying off credit cards improve my credit score?',
        answer:
          'Yes. Lowering your credit utilization ratio (balance ÷ limit) improves your score, typically within 1–2 billing cycles. Paying off entirely is even better, though closing old accounts can temporarily lower your score.',
      },
      {
        question: 'Can I use this calculator if I have multiple credit cards?',
        answer:
          'Yes. You can add multiple cards to the calculator and it will model paying off both together using either Snowball or Avalanche. See which strategy saves you the most interest and time.',
      },
      {
        question: 'Is this calculator really free?',
        answer:
          'Yes, this calculator is completely free and requires no signup. You can save your plan with a free SnowballPay account to track real progress against your forecast, but the calculator itself has no cost.',
      },
    ],
    relatedCalculators: [
      { slug: 'auto-loan-payoff', title: 'Auto Loan Payoff Calculator' },
      { slug: 'student-loan-payoff', title: 'Student Loan Payoff Calculator' },
      { slug: 'personal-loan-payoff', title: 'Personal Loan Payoff Calculator' },
    ],
  },
};

export function getCalculatorConfig(slug: string): CalculatorConfig | null {
  return calculatorConfigs[slug] ?? null;
}
