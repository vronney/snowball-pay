import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// These routes load debts through an explicit Prisma `select` and then cast
// the result to `Debt[]` before handing it to calculatePlanMetrics /
// calculateMinimumsOnlyResult. An explicit select that omits `inPlan` comes
// back `undefined` for that field, and the `Debt[]` cast hides the missing
// column from tsc — so every debt silently reads as in the plan. This guard
// reads each route file as text and asserts its debt select includes
// `inPlan: true`, so a future edit that drops the column fails CI instead of
// only failing in production plan math.
const ROUTE_FILES = [
  'src/app/api/email/lifecycle/route.ts',
  'src/app/api/cron/lifecycle-emails/route.ts',
  'src/app/api/cron/trial-emails/route.ts',
  'src/app/api/cron/monthly-review/route.ts',
  'src/app/api/cron/weekly-progress/route.ts',
];

describe('debt selects carry inPlan', () => {
  it.each(ROUTE_FILES)('%s selects inPlan on every debt select feeding plan math', (relativePath) => {
    const filePath = path.join(process.cwd(), relativePath);
    const contents = fs.readFileSync(filePath, 'utf8');
    expect(contents).toContain('inPlan: true');
  });

  it('lifecycle-emails route selects inPlan on both the day5 and day7 debt selects', () => {
    const filePath = path.join(process.cwd(), 'src/app/api/cron/lifecycle-emails/route.ts');
    const contents = fs.readFileSync(filePath, 'utf8');
    const matches = contents.match(/inPlan: true/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});
