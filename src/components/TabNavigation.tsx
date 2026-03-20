'use client';

import { List, Wallet, TrendingDown, Upload } from 'lucide-react';

interface TabNavigationProps {
  activeTab: 'debts' | 'income' | 'plan' | 'documents';
  onTabChange: (tab: 'debts' | 'income' | 'plan' | 'documents') => void;
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    { id: 'debts',     label: 'My Debts',       icon: List },
    { id: 'income',    label: 'Income & Budget', icon: Wallet },
    { id: 'plan',      label: 'Payoff Plan',     icon: TrendingDown },
    { id: 'documents', label: 'Documents',       icon: Upload },
  ];

  return (
    <nav className="max-w-4xl mx-auto px-6 mb-6 pt-4">
      <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as 'debts' | 'income' | 'plan' | 'documents')}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.4)',
                boxShadow: isActive ? '0 0 0 1px rgba(59,130,246,0.25)' : 'none',
              }}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
