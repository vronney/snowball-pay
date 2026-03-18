'use client';

import { List, Wallet, TrendingDown, Upload } from 'lucide-react';

interface TabNavigationProps {
  activeTab: 'debts' | 'income' | 'plan' | 'documents';
  onTabChange: (tab: 'debts' | 'income' | 'plan' | 'documents') => void;
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    { id: 'debts', label: 'My Debts', icon: List },
    { id: 'income', label: 'Income & Budget', icon: Wallet },
    { id: 'plan', label: 'Payoff Plan', icon: TrendingDown },
    { id: 'documents', label: 'Documents', icon: Upload },
  ];

  return (
    <nav className="max-w-4xl mx-auto px-6 flex gap-6 border-b border-white/10 mb-6">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as 'debts' | 'income' | 'plan' | 'documents')}
            className={`pb-3 text-sm font-semibold cursor-pointer bg-transparent border-0 flex items-center gap-1.5 transition-all ${
              isActive
                ? 'border-b-2 border-action text-action'
                : 'border-b-2 border-transparent opacity-50 hover:opacity-80'
            }`}
          >
            <Icon size={14} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
