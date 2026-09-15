import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// These routes load debts through an explicit Prisma `select` and then cast
// the result to `Debt[]` before handing it to calculatePlanMetrics /
// calculateMinimumsOnlyResult. An explicit select that omits `inPlan` comes
// back `undefined` for that field, and the `Debt[]` cast hides the missing
// column from tsc — so every debt silently reads as in the plan. This guard
// reads each route file as text, finds every debt `select` block, and
// asserts each one includes `inPlan: true`, so a future edit that adds a new
// plan-math select without the column — or drops it from an existing one —
// fails CI instead of only failing in production plan math.
const ROUTE_FILES = [
  'src/app/api/email/lifecycle/route.ts',
  'src/app/api/cron/lifecycle-emails/route.ts',
  'src/app/api/cron/trial-emails/route.ts',
  'src/app/api/cron/monthly-review/route.ts',
  'src/app/api/cron/weekly-progress/route.ts',
];

// The one debt select that doesn't feed plan math: the day-2 lifecycle-emails
// `hasDebts` gate only needs a count of debts, not plan fields, so it selects
// `id` alone. Excluded by exact text rather than being expected to carry
// `inPlan: true` like every other select.
const EXCLUDED_BLOCKS: ReadonlyArray<{ file: string; text: string }> = [
  {
    file: 'src/app/api/cron/lifecycle-emails/route.ts',
    text: 'debts: { select: { id: true } }',
  },
];

/**
 * Finds every `debts: { ... }` block in `contents` by balancing braces from
 * the `{` immediately after `debts:`, instead of a greedy regex that could
 * swallow neighboring code or stop short on a multi-line block. A block that
 * doesn't contain `select:` (e.g. a `where` clause's `debts: { some: {} }`)
 * isn't a debt select at all and is dropped — it was never a candidate to
 * carry `inPlan`.
 */
function findDebtSelectBlocks(contents: string): string[] {
  const blocks: string[] = [];
  const re = /debts:\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(contents))) {
    const start = match.index;
    const braceStart = start + match[0].length - 1; // index of the opening '{'
    let depth = 0;
    let end = -1;
    for (let i = braceStart; i < contents.length; i++) {
      if (contents[i] === '{') depth++;
      else if (contents[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) throw new Error(`Unbalanced braces scanning a "debts:" block at index ${start}`);
    blocks.push(contents.slice(start, end + 1));
  }
  return blocks.filter((block) => block.includes('select:'));
}

describe('debt selects carry inPlan', () => {
  it.each(ROUTE_FILES)('%s: every debt select block feeding plan math includes inPlan: true', (relativePath) => {
    const filePath = path.join(process.cwd(), relativePath);
    const contents = fs.readFileSync(filePath, 'utf8');
    const selectBlocks = findDebtSelectBlocks(contents);
    expect(selectBlocks.length).toBeGreaterThan(0);

    const excludedTexts = EXCLUDED_BLOCKS.filter((e) => e.file === relativePath).map((e) => e.text);
    // The exclusion itself must still be present — if this line is rewritten,
    // the exclusion should stop applying rather than silently keep excusing
    // whatever replaced it.
    for (const excluded of excludedTexts) {
      expect(selectBlocks.some((block) => block.includes(excluded))).toBe(true);
    }

    const planMathBlocks = selectBlocks.filter(
      (block) => !excludedTexts.some((excluded) => block.includes(excluded)),
    );
    for (const block of planMathBlocks) {
      expect(block).toContain('inPlan: true');
    }
  });

  it('lifecycle-emails route selects inPlan on both the day5 and day7 debt selects', () => {
    const filePath = path.join(process.cwd(), 'src/app/api/cron/lifecycle-emails/route.ts');
    const contents = fs.readFileSync(filePath, 'utf8');
    const planMathBlocks = findDebtSelectBlocks(contents).filter(
      (block) => !block.includes('debts: { select: { id: true } }'),
    );
    expect(planMathBlocks).toHaveLength(2);
    expect(planMathBlocks.every((block) => block.includes('inPlan: true'))).toBe(true);
  });
});
