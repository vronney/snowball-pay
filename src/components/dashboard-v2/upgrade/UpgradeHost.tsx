"use client";

import { useEffect, useState } from "react";
import { useDashboardInsights } from "@/lib/hooks";
import TrialStartSheet from "./TrialStartSheet";
import UpgradeFallbackSheet from "./UpgradeFallbackSheet";

interface UpgradeHostProps {
  feature?: string;
  interestAtStake: number;
  onClose: () => void;
}

/**
 * Where every v2 upgrade request lands (spec §7). Gated tiles, the gated move
 * list and row, the closing CTAs, the rail and any 403 upgrade_required all
 * dispatch through upgradeEvents, and DashboardClient renders this under the
 * flag. A never-trialed Free account gets moment A; everyone else, including
 * while insights load, gets checkout, so a trial is never offered unconfirmed.
 *
 * Once `TrialStartSheet` has been shown, this never swaps to
 * `UpgradeFallbackSheet`: every settled mutation refreshes insights, so a 409
 * from another tab or a window-focus refetch mid-request can flip
 * `trial.eligible` back to false even though the trial is (or may be) on. In
 * that case it closes once `tier.proEligible` confirms the trial is on, or
 * otherwise keeps rendering the trial sheet (and any error it is showing).
 */
export default function UpgradeHost({ feature, interestAtStake, onClose }: UpgradeHostProps) {
  const { data: insights } = useDashboardInsights();
  const [trialShown, setTrialShown] = useState(false);

  const eligible = insights?.tier.trial.eligible === true;
  const proEligible = insights?.tier.proEligible === true;

  // Latch the state in an effect rather than mutating a ref during render:
  // an interrupted/discarded concurrent render could otherwise leave the ref
  // set for a render that never committed. Reading `eligible` directly in
  // `showTrial` below still shows the sheet on the very render that turns
  // eligible true — the latch only needs to survive the later render where
  // eligibility drops again.
  useEffect(() => {
    if (eligible) setTrialShown(true);
  }, [eligible]);

  const showTrial = eligible || trialShown;
  const shouldClose = trialShown && proEligible;

  useEffect(() => {
    if (shouldClose) onClose();
  }, [shouldClose, onClose]);

  if (shouldClose) return null;
  if (showTrial) return <TrialStartSheet onClose={onClose} />;
  return <UpgradeFallbackSheet feature={feature} interestAtStake={interestAtStake} onClose={onClose} />;
}
