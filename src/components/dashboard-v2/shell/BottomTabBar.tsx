"use client";

import type { Tab } from "@/components/dashboard/types";
import { BOTTOM_TAB_ITEMS, COACH_TAB } from "./navItems";

interface BottomTabBarProps {
  activeTab: Tab;
  onSelectTab: (tab: Tab) => void;
  coachDot: boolean;
}

/** Mobile navigation (README "Bottom tab bar"): five tabs, 44px targets, safe-area aware. */
export default function BottomTabBar({ activeTab, onSelectTab, coachDot }: BottomTabBarProps) {
  return (
    <nav
      aria-label="Dashboard"
      className="shrink-0 border-t border-border bg-surface px-1 pb-[calc(8px+env(safe-area-inset-bottom))] pt-[7px] min-[769px]:hidden"
    >
      <ul className="grid grid-cols-5">
        {BOTTOM_TAB_ITEMS.map(({ id, shortLabel, icon: Icon }) => {
          const active = activeTab === id;
          const showDot = coachDot && id === COACH_TAB;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onSelectTab(id)}
                aria-current={active ? "page" : undefined}
                aria-label={showDot && id === COACH_TAB ? `${shortLabel}, new moves` : undefined}
                className={`flex min-h-11 w-full flex-col items-center justify-center gap-[3px] rounded-lg py-[5px] text-[10px] outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-action ${
                  active ? "font-extrabold text-action" : "font-bold text-txt-muted"
                }`}
              >
                <span className="relative">
                  <Icon size={16} strokeWidth={active ? 2.2 : 1.7} aria-hidden="true" />
                  {showDot && (
                    <span className="absolute -right-2 -top-1 h-[7px] w-[7px] rounded-full bg-danger" aria-hidden="true" />
                  )}
                </span>
                <span>{shortLabel}</span>{showDot && <span className="sr-only">, new moves</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
