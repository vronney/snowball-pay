/**
 * The feature keys v2's gated controls send through upgradeEvents. Each one
 * selects getUpgradeMessage's copy (src/lib/upgradeMessaging.ts) in the
 * upgrade sheet. v1 components keep their own literals.
 */
export const UPGRADE_FEATURE = {
  coachMoves: 'Coach moves',
  whatIf: 'What-if scenarios',
  customPriority: 'Custom priority order',
} as const;
