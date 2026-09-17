"use client";

import Image from "next/image";
import type { Tab } from "@/components/dashboard/types";
import type { UpgradeRailSummary } from "@/lib/dashboard/upgradeRail";
import { COACH_TAB, SIDEBAR_ITEMS } from "./navItems";
import UpgradeRail from "./UpgradeRail";

interface V2SidebarProps {
  activeTab: Tab;
  onSelectTab: (tab: Tab) => void;
  coachDot: boolean;
  rail: UpgradeRailSummary | null;
  /** The rail invites a trial for an account that can start one. */
  trialEligible?: boolean;
  onUpgrade: () => void;
}

/** Desktop navigation: 200px, 6 items, the upgrade rail as its foot (DESIGN.md 2026-09-12). */
export default function V2Sidebar({ activeTab, onSelectTab, coachDot, rail, trialEligible = false, onUpgrade }: V2SidebarProps) {
  return (
    <aside className="hidden w-[200px] shrink-0 flex-col border-r border-border bg-surface min-[769px]:flex">
      <div className="px-[18px] pb-4 pt-[22px]">
        <a href="/" className="inline-flex rounded-md outline-none focus-visible:outline-2 focus-visible:outline-action">
          <Image src="/logo-dark.svg" alt="SnowballPay" width={130} height={24} priority />
        </a>
      </div>
      <nav aria-label="Dashboard sections" className="flex-1 overflow-y-auto">
        <ul>
          {SIDEBAR_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            const showDot = coachDot && id === COACH_TAB;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onSelectTab(id)}
                  aria-label={showDot ? `${label}, new moves` : undefined}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 w-full items-center gap-2.5 border-l-[3px] px-[15px] py-[11px] text-left text-[13px] outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-action ${
                    active
                      ? "border-action bg-action/10 font-extrabold text-action"
                      : "border-transparent font-semibold text-txt-muted hover:bg-bg hover:text-txt"
                  }`}
                >
                  <Icon size={16} strokeWidth={active ? 2.2 : 1.7} aria-hidden="true" />
                  <span className="flex-1">{label}</span>{showDot && <span className="h-[7px] w-[7px] rounded-full bg-danger" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      {rail && <UpgradeRail rail={rail} trialEligible={trialEligible} onUpgrade={onUpgrade} />}
    </aside>
  );
}
