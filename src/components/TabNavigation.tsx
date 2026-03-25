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
    { id: 'documents', label: 'Import',           icon: Upload },
  ];

  return (
    <nav className="max-w-4xl mx-auto px-4 mb-6 pt-4">
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: '3px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '4px', width: 'fit-content', minWidth: '100%' }}>
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
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.18s ease',
                  background: isActive ? 'rgba(59,130,246,0.16)' : 'transparent',
                  color: isActive ? '#93c5fd' : 'rgba(255,255,255,0.35)',
                  boxShadow: isActive ? '0 0 0 1px rgba(59,130,246,0.28), inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
                  letterSpacing: isActive ? '-0.01em' : '0',
                  flex: 1,
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
