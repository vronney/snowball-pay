# /review

Run a focused code review on the current branch/diff.

## Scope
- Prioritize bugs, regressions, security issues, and missing tests.
- Keep summaries brief; findings first.

## Process
1. Inspect changed files and related call paths.
2. Classify findings by severity:
   - Critical
   - High
   - Medium
   - Low
3. For each finding, provide:
   - file path + line reference
   - why it is a problem
   - concrete fix recommendation
4. If no findings, state that explicitly and note residual risks.

## Safety
- Do not run destructive commands.
- Do not modify files unless explicitly asked to patch after review.
