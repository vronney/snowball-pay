"use client";

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
 */
export default function UpgradeHost({ feature, interestAtStake, onClose }: UpgradeHostProps) {
  const { data: insights } = useDashboardInsights();
  if (insights?.tier.trial.eligible === true) return <TrialStartSheet onClose={onClose} />;
  return <UpgradeFallbackSheet feature={feature} interestAtStake={interestAtStake} onClose={onClose} />;
}
