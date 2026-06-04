"use client";

import { useState } from "react";
import { useUserSettings } from "@/lib/hooks";
import UpgradeModal from "@/components/billing/UpgradeModal";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { BillingSection } from "@/components/settings/BillingSection";
import { NotificationPreferencesSection } from "@/components/settings/NotificationPreferencesSection";
import { AccountSection } from "@/components/settings/AccountSection";
import { DangerZoneSection } from "@/components/settings/DangerZoneSection";

interface SettingsTabProps {
  user: {
    name?: string | null;
    email?: string | null;
    picture?: string | null;
  } | null;
}

export default function SettingsTab({ user }: SettingsTabProps) {
  const { data: savedSettings } = useUserSettings();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  return (
    <div
      style={{
        maxWidth: "640px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <ProfileSection user={user} />
      <BillingSection onUpgradeClick={() => setUpgradeModalOpen(true)} />
      <NotificationPreferencesSection />
      <AccountSection />
      <DangerZoneSection />

      {upgradeModalOpen && (
        <UpgradeModal onClose={() => setUpgradeModalOpen(false)} />
      )}
    </div>
  );
}
