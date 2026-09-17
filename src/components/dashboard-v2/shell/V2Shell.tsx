"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useDashboardInsights } from "@/lib/hooks";
import { computeUpgradeRail } from "@/lib/dashboard/upgradeRail";
import { UPGRADE_FEATURE } from "@/lib/dashboard/upgradeFeatures";
import { upgradeEvents } from "@/lib/upgradeEvents";
import BottomTabBar from "./BottomTabBar";
import { COACH_TAB } from "./navItems";
import { useCoachDot } from "./useCoachDot";
import V2Header, { type V2HeaderProps } from "./V2Header";
import V2Sidebar from "./V2Sidebar";

export interface V2ShellProps extends V2HeaderProps {
  /**
   * Above the tab content, inside the scroll area. PR 6 retired the v1 trial
   * countdown here; it now carries TrialChargeNotice, the auto-charge warning
   * for a card-backed Stripe trial.
   */
  banner?: ReactNode;
  /** Fixed layers (toasts) that read --v2-tabbar-offset to clear the bottom bar. */
  overlays?: ReactNode;
  children: ReactNode;
}

/**
 * Dashboard v2 frame (spec §8.3). One scroll model at every width: a 100dvh
 * row where only <main> scrolls, so the header and both navs stay put. Every
 * direct child of the scroll area is shrink-0 (README "Mobile shell").
 */
export default function V2Shell({ banner, overlays, children, ...header }: V2ShellProps) {
  const { activeTab, onSelectTab } = header;
  const { data: insights } = useDashboardInsights();
  const coachDot = useCoachDot(insights?.coachMoves, activeTab === COACH_TAB);
  const rail = computeUpgradeRail(insights);
  const trialEligible = insights?.tier.trial.eligible === true;
  const mainRef = useRef<HTMLElement>(null);

  // Tab switches are state, not navigations, and the scroll area (not the
  // window) holds the position, so reset it the way a new page would.
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [activeTab]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-bg [--v2-tabbar-offset:calc(61px+env(safe-area-inset-bottom))] min-[769px]:[--v2-tabbar-offset:0px]">
      <V2Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        coachDot={coachDot}
        rail={rail}
        trialEligible={trialEligible}
        onUpgrade={() => upgradeEvents.dispatch(UPGRADE_FEATURE.coachMoves)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <V2Header {...header} />
        <main ref={mainRef} className="flex flex-1 flex-col overflow-y-auto overscroll-contain">
          {banner && <div className="shrink-0">{banner}</div>}
          <div className="w-full shrink-0 px-3.5 py-3 min-[769px]:px-[26px] min-[769px]:py-5">{children}</div>
        </main>
        <BottomTabBar activeTab={activeTab} onSelectTab={onSelectTab} coachDot={coachDot} />
      </div>
      {overlays}
    </div>
  );
}
