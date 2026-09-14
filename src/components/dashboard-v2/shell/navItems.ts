import {
  BarChart2,
  Calendar,
  CreditCard,
  Lightbulb,
  TrendingDown,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Tab } from "@/components/dashboard/types";

export interface V2NavItem {
  id: Tab;
  label: string;
  /** Bottom-bar label (10px, five columns). */
  shortLabel: string;
  icon: LucideIcon;
}

/**
 * v2 tab titles. The Coach rename is label-only: the id stays `intelligence`,
 * so deep links (?tab=intelligence) and DASHBOARD_TAB_VIEWED are unchanged.
 */
export const V2_TAB_LABELS: Record<Tab, string> = {
  "this-month": "This Month",
  debts: "My Debts",
  income: "Income & Budget",
  plan: "My Plan",
  progress: "Progress",
  intelligence: "Coach",
  settings: "Settings",
};

export const COACH_TAB = "intelligence" satisfies Tab;

// Icons match the v1 sidebar (DashboardSidebar.tsx).
function item(id: Tab, shortLabel: string, icon: LucideIcon): V2NavItem {
  return { id, label: V2_TAB_LABELS[id], shortLabel, icon };
}

const MONTH = item("this-month", "Month", Calendar);
const DEBTS = item("debts", "Debts", CreditCard);
const INCOME = item("income", "Budget", Wallet);
const PLAN = item("plan", "Plan", TrendingDown);
const PROGRESS = item("progress", "Progress", BarChart2);
const COACH = item(COACH_TAB, "Coach", Lightbulb);

/** Desktop sidebar: 6 items (DESIGN.md 2026-09-12). */
export const SIDEBAR_ITEMS: ReadonlyArray<V2NavItem> = [MONTH, DEBTS, INCOME, PLAN, PROGRESS, COACH];

/**
 * Mobile bottom bar, in the design's order. Income & Budget and Settings are
 * reached from the avatar menu on mobile (D11).
 */
export const BOTTOM_TAB_ITEMS: ReadonlyArray<V2NavItem> = [MONTH, DEBTS, COACH, PLAN, PROGRESS];
