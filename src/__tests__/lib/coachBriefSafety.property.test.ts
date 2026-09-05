import { describe, it, expect } from 'vitest';
import { findBriefViolation, type CoachBrief, type EliminationCheckDebt } from '@/lib/coachBriefSafety';

/**
 * Property tests for the elimination law's affordability model.
 *
 * Every example-based test on this law describes a shape someone already
 * thought of. Nine review findings on PR #93 were the opposite: allocation
 * bugs that needed two or more simultaneous declared claims to show up, a
 * combination the four live-sweep scenarios produce essentially never (0
 * multi-entry declarations across 120 briefs). Two of them re-broke behaviour
 * this codebase had already settled.
 *
 * These tests generate the combination instead of imagining it, and assert
 * properties that must hold for EVERY input rather than outcomes for chosen
 * ones. A failure prints the seed, so any counterexample is replayable.
 */

/** mulberry32 — small, seedable, and good enough to enumerate shapes. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Enough to enumerate the shapes that matter without being slow enough to
// time out under parallel workers: every historical bug below was caught in
// well under a second at this size. An explicit timeout is set per test too,
// because the vitest default (5s) is close enough to the runtime of the two
// shuffling properties that they failed intermittently in the full suite while
// passing when the file ran alone.
const CASES = 1500;
const PROPERTY_TIMEOUT_MS = 30_000;

interface Scenario {
  debts: EliminationCheckDebt[];
  brief: CoachBrief;
  effectiveAcceleration: number;
  availableCashFlow: number;
}

/**
 * Text is fixed and deliberately claim-free so the DECLARATION path is what is
 * under test: no payoff verb, no suppression verb, no runway. Anything the
 * prose law would react to becomes noise that hides real counterexamples.
 */
const NEUTRAL_TEXT = {
  headline: 'Steady progress this month',
  summary: 'Balances are tracking the plan and every minimum is funded.',
  title: 'Keep the plan steady',
  body: 'Keep the plan steady this month and log each payment as it lands.',
  action: 'Stay on the current plan',
};

function makeScenario(random: () => number): Scenario {
  const pick = (n: number) => Math.floor(random() * n);
  const debtCount = 1 + pick(4);
  const names = ['Store Card', 'Blue Card', 'Green Card', 'Delta Amex'];
  const focusIndex = pick(debtCount);
  const debts: EliminationCheckDebt[] = Array.from({ length: debtCount }, (_, i) => ({
    name: names[i],
    balance: 50 + pick(40) * 50,
    minimumPayment: 10 + pick(10) * 5,
    isFocus: i === focusIndex,
  }));

  const effectiveAcceleration = pick(8) * 100;
  const availableCashFlow = effectiveAcceleration + pick(5) * 100;
  const isSetAcceleration = random() < 0.4;
  // Kept inside the other laws' bounds on purpose: this file is about the
  // elimination check, and a ceiling or target violation would mask it.
  const targetExtra = isSetAcceleration ? pick(Math.floor(availableCashFlow / 50) + 1) * 50 : null;
  // The redirect ceiling is the extra the action leaves in play: the target
  // for a set_acceleration, the plan's acceleration for every other kind.
  const redirectCeiling = isSetAcceleration ? (targetExtra as number) : effectiveAcceleration;
  const redirectAmount = pick(Math.floor(redirectCeiling / 50) + 1) * 50;

  const claimCount = pick(4);
  const payoffClaims = Array.from({ length: claimCount }, () => ({
    debtName: debts[pick(debtCount)].name,
    horizonMonths: 1 + pick(6),
  }));

  return {
    debts,
    effectiveAcceleration,
    availableCashFlow,
    brief: {
      verdict: {
        status: 'on_track',
        headline: NEUTRAL_TEXT.headline,
        summary: NEUTRAL_TEXT.summary,
      },
      nextAction: {
        title: NEUTRAL_TEXT.title,
        body: NEUTRAL_TEXT.body,
        action: NEUTRAL_TEXT.action,
        impact: 'medium',
        kind: isSetAcceleration ? 'set_acceleration' : 'keep_course',
        targetExtra,
        outcome: null,
        redirectAmount,
        payoffClaims,
      },
    },
  };
}

const verdict = (s: Scenario) =>
  findBriefViolation(s.brief, s.effectiveAcceleration, s.availableCashFlow, s.debts);

function shuffled<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** A readable dump so a counterexample can be turned into a unit test. */
function describeCase(seed: number, s: Scenario): string {
  return JSON.stringify(
    {
      seed,
      effectiveAcceleration: s.effectiveAcceleration,
      availableCashFlow: s.availableCashFlow,
      debts: s.debts,
      kind: s.brief.nextAction.kind,
      targetExtra: s.brief.nextAction.targetExtra,
      redirectAmount: s.brief.nextAction.redirectAmount,
      payoffClaims: s.brief.nextAction.payoffClaims,
    },
    null,
    2,
  );
}

describe('elimination law: properties over generated inputs', () => {
  it('gives the same verdict however the claims are ordered', () => {
    // payoffClaims carries no ordering meaning in the prompt. Equal horizons
    // once inherited the JSON array order through a stable sort, so the same
    // brief could pass or fail on list position alone (Codex, PR #93).
    for (let seed = 1; seed <= CASES; seed += 1) {
      const random = rng(seed);
      const scenario = makeScenario(random);
      const reordered: Scenario = {
        ...scenario,
        brief: {
          ...scenario.brief,
          nextAction: {
            ...scenario.brief.nextAction,
            payoffClaims: shuffled(scenario.brief.nextAction.payoffClaims, random),
          },
        },
      };
      expect(verdict(reordered), describeCase(seed, scenario)).toBe(verdict(scenario));
    }
  }, PROPERTY_TIMEOUT_MS);

  it('gives the same verdict however the debts are ordered', () => {
    // The debts array arrives in unsorted Prisma order. A non-target debt
    // sitting earlier in it used to release its freed minimum into the pot
    // within the same month, so array position changed retirement times
    // (Codex and CodeRabbit, PR #93).
    for (let seed = 1; seed <= CASES; seed += 1) {
      const random = rng(seed);
      const scenario = makeScenario(random);
      const reordered: Scenario = { ...scenario, debts: shuffled(scenario.debts, random) };
      expect(verdict(reordered), describeCase(seed, scenario)).toBe(verdict(scenario));
    }
  }, PROPERTY_TIMEOUT_MS);

  it('never turns a lawful brief unlawful by granting MORE time', () => {
    // Monotonicity. Extending every declared horizon can only make claims
    // easier to fund, so an accepted brief must stay accepted.
    for (let seed = 1; seed <= CASES; seed += 1) {
      const scenario = makeScenario(rng(seed));
      if (verdict(scenario) !== null) continue;
      const slower: Scenario = {
        ...scenario,
        brief: {
          ...scenario.brief,
          nextAction: {
            ...scenario.brief.nextAction,
            payoffClaims: scenario.brief.nextAction.payoffClaims.map((c) => ({
              ...c,
              horizonMonths: c.horizonMonths + 1,
            })),
          },
        },
      };
      expect(verdict(slower), describeCase(seed, scenario)).toBeNull();
    }
  }, PROPERTY_TIMEOUT_MS);

  it('never accepts a claim no allocation could possibly fund', () => {
    // The money ceiling. In N months the plan cannot move more than
    // N x (every minimum + the monthly extra) in total, whatever order it uses
    // and however the redirect is allocated. A declared payoff whose balance
    // exceeds that bound is impossible under ANY model, so an accept is a
    // phantom-capacity bug — which is what "the redirect funded a payoff the
    // action was removing" was (Codex, PR #93).
    for (let seed = 1; seed <= CASES; seed += 1) {
      const scenario = makeScenario(rng(seed));
      const { nextAction } = scenario.brief;
      const monthlyExtra =
        nextAction.kind === 'set_acceleration'
          ? Math.max(0, nextAction.targetExtra ?? 0)
          : scenario.effectiveAcceleration;
      const totalMinimums = scenario.debts.reduce((sum, d) => sum + d.minimumPayment, 0);

      const impossible = nextAction.payoffClaims.some((claim) => {
        const debt = scenario.debts.find((d) => d.name === claim.debtName);
        if (!debt) return false;
        // The rounding allowance is half a month, so grant a whole one here:
        // the bound must be generous enough that only genuine phantoms trip it.
        const months = claim.horizonMonths + 1;
        return debt.balance > months * (totalMinimums + monthlyExtra) + 1;
      });
      if (!impossible) continue;
      expect(verdict(scenario), describeCase(seed, scenario)).not.toBeNull();
    }
  }, PROPERTY_TIMEOUT_MS);

  it('never accepts a set of claims whose balances exceed the money available', () => {
    // The same ceiling applied to the SET. Two debts declared paid out of one
    // pot is the double-spend family: by the latest declared horizon the plan
    // cannot have moved more than that total, so the claimed balances must fit
    // inside it.
    for (let seed = 1; seed <= CASES; seed += 1) {
      const scenario = makeScenario(rng(seed));
      const { nextAction } = scenario.brief;
      if (nextAction.payoffClaims.length < 2) continue;
      const monthlyExtra =
        nextAction.kind === 'set_acceleration'
          ? Math.max(0, nextAction.targetExtra ?? 0)
          : scenario.effectiveAcceleration;
      const totalMinimums = scenario.debts.reduce((sum, d) => sum + d.minimumPayment, 0);

      const claimed = new Map<string, EliminationCheckDebt>();
      for (const claim of nextAction.payoffClaims) {
        const debt = scenario.debts.find((d) => d.name === claim.debtName);
        if (debt) claimed.set(debt.name, debt);
      }
      const claimedBalance = [...claimed.values()].reduce((sum, d) => sum + d.balance, 0);
      const latest = Math.max(...nextAction.payoffClaims.map((c) => c.horizonMonths)) + 1;
      if (claimedBalance <= latest * (totalMinimums + monthlyExtra) + claimed.size) continue;
      expect(verdict(scenario), describeCase(seed, scenario)).not.toBeNull();
    }
  });
});
