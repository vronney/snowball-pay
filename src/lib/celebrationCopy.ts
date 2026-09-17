/**
 * The celebration message shown when no generated one is available: a rate
 * limit, an AI timeout, or JSON that would not parse. It states what happened
 * and claims nothing about progress.
 *
 * Shared by the client (the 429 branch of fireCelebration) and the celebration
 * route, which fall back for different reasons and must read the same.
 */
export function celebrationFallbackMessage(debtName: string, alsoLoggedCount = 0): string {
  return alsoLoggedCount > 0
    ? `${debtName} and ${alsoLoggedCount} more — payments logged.`
    : `${debtName} — payment logged.`;
}
