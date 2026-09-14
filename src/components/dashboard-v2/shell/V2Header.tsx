"use client";

import Image from "next/image";
import type { Notification, Tab } from "@/components/dashboard/types";
import NotificationPanel from "@/components/dashboard/NotificationPanel";
import { PlaidLink } from "@/components/plaid/PlaidLink";
import AvatarMenu, { type ShellUser } from "./AvatarMenu";
import { V2_TAB_LABELS } from "./navItems";

export interface V2HeaderProps {
  activeTab: Tab;
  onSelectTab: (tab: Tab) => void;
  notifications: Notification[];
  onNavigate: (tab: Tab, debtId?: string) => void;
  onMarkPaid: (debtId: string, amount: number, year: number, month: number) => void;
  user: ShellUser | null;
  initials: string;
  plaidEnabled: boolean;
}

// PlaidLink's header button takes its spacing from its parent (v1 sets it in
// DashboardClient's <style>). Same values: labeled down to 480px, icon-only on phones.
const PLAID_SLOT =
  "[&_.plaid-link-btn]:gap-[7px] [&_.plaid-link-btn]:px-3.5 [&_.plaid-link-btn]:py-2 max-[768px]:[&_.plaid-link-btn]:gap-1.5 max-[768px]:[&_.plaid-link-btn]:px-3 max-[479px]:[&_.plaid-link-btn]:gap-0 max-[479px]:[&_.plaid-link-btn]:rounded-full max-[479px]:[&_.plaid-link-btn]:p-2.5 max-[479px]:[&_.plaid-link-label]:hidden";

// The bell (v1 NotificationPanel, ~34px) and Link bank are reused as-is; on
// mobile the shell lifts both to its 44px touch-target minimum.
const MOBILE_TARGETS =
  "max-[768px]:[&_button[aria-label='Notifications']]:min-h-11 max-[768px]:[&_button[aria-label='Notifications']]:min-w-11 max-[768px]:[&_.plaid-link-btn]:min-h-11 max-[768px]:[&_.plaid-link-btn]:min-w-11";

/** 56px header (spec §8.3): title on desktop, wordmark on mobile; bell, Link bank (unchanged gate), account menu. */
export default function V2Header({
  activeTab,
  onSelectTab,
  notifications,
  onNavigate,
  onMarkPaid,
  user,
  initials,
  plaidEnabled,
}: V2HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 min-[769px]:px-[26px]">
      <a href="/" aria-label="SnowballPay home" className="inline-flex min-h-11 shrink-0 items-center min-[769px]:hidden">
        <Image src="/logo-dark.svg" alt="" width={120} height={22} priority />
      </a>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-extrabold tracking-[-0.02em] text-txt max-[768px]:sr-only">
          {V2_TAB_LABELS[activeTab]}
        </h1>
      </div>
      <div className={`flex shrink-0 items-center gap-2 ${PLAID_SLOT} ${MOBILE_TARGETS}`}>
        <NotificationPanel
          notifications={notifications}
          tabLabels={V2_TAB_LABELS}
          onNavigate={onNavigate}
          onMarkPaid={onMarkPaid}
        />
        {plaidEnabled && <PlaidLink />}
        <AvatarMenu user={user} initials={initials} onSelectTab={onSelectTab} />
      </div>
    </header>
  );
}
