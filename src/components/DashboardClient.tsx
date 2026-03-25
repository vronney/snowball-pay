'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useDebts, useIncome, useExpenses, useUserSettings } from '@/lib/hooks';
import DebtTab from '@/components/tabs/DebtTab';
import IncomeTab from '@/components/tabs/IncomeTab';
import PayoffTab from '@/components/tabs/PayoffTab';
import DocumentImport from '@/components/DocumentImport';
import IntelligenceTab from '@/components/tabs/IntelligenceTab';
import SettingsTab from '@/components/tabs/SettingsTab';
import Image from 'next/image';
import {
  CreditCard,
  Wallet,
  TrendingDown,
  Upload,
  Sparkles,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  AlertTriangle,
  CalendarClock,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

type UserInfo = {
  name?: string | null;
  email?: string | null;
  picture?: string | null;
};

type Tab = 'debts' | 'income' | 'plan' | 'intelligence' | 'documents' | 'settings';

interface Notification {
  id: string;
  type: 'urgent' | 'warning' | 'info';
  icon: typeof AlertTriangle;
  title: string;
  body: string;
  tab?: Tab;
}

const navItems = [
  { id: 'debts',        label: 'My Debts',    icon: CreditCard },
  { id: 'income',       label: 'Income',      icon: Wallet },
  { id: 'plan',         label: 'Payoff Plan', icon: TrendingDown },
  { id: 'intelligence', label: 'Intelligence', icon: Sparkles },
  { id: 'documents',    label: 'Import',      icon: Upload },
];

export default function DashboardClient({ user }: { user: UserInfo | null }) {
  const [activeTab, setActiveTab] = useState<Tab>('debts');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: debtsData, isLoading: debtsLoading } = useDebts();
  const { data: incomeData, isLoading: incomeLoading } = useIncome();
  const { data: expensesData, isLoading: expensesLoading } = useExpenses();
  const { data: settingsData } = useUserSettings();

  const debts = useMemo(() => debtsData?.debts ?? [], [debtsData?.debts]);
  const income = incomeData?.income;
  const expenses = useMemo(() => expensesData?.expenses ?? [], [expensesData?.expenses]);

  // Close notif panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [notifOpen]);

  // Build notifications from live data
  const notifications = useMemo((): Notification[] => {
    const items: Notification[] = [];
    const today = new Date();
    const notifyDueDates = settingsData?.preferences?.notifyDueDates ?? true;
    const notifyLowBuffer = settingsData?.preferences?.notifyLowBuffer ?? true;

    // 1. Upcoming due dates from debts that have dueDate set
    const debtsWithDue = notifyDueDates ? debts.filter((d) => d.dueDate != null) : [];
    for (const debt of debtsWithDue) {
      const day = debt.dueDate as number;
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), day);
      const nextDue = thisMonth >= today
        ? thisMonth
        : new Date(today.getFullYear(), today.getMonth() + 1, day);
      const daysUntil = Math.ceil((nextDue.getTime() - today.getTime()) / 86400000);

      if (daysUntil <= 3) {
        items.push({
          id: `due-urgent-${debt.id}`,
          type: 'urgent',
          icon: CalendarClock,
          title: `${debt.name} due in ${daysUntil === 0 ? 'today' : `${daysUntil}d`}`,
          body: `Minimum payment of $${debt.minimumPayment.toFixed(2)} due on the ${day}${day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}.`,
          tab: 'debts',
        });
      } else if (daysUntil <= 7) {
        items.push({
          id: `due-warn-${debt.id}`,
          type: 'warning',
          icon: CalendarClock,
          title: `${debt.name} due in ${daysUntil}d`,
          body: `Minimum payment of $${debt.minimumPayment.toFixed(2)} coming up.`,
          tab: 'debts',
        });
      }
    }

    // 2. Guardrail: low cash buffer after acceleration
    if (notifyLowBuffer && income) {
      const recurringTotal = expenses.reduce((s, e) => s + e.amount, 0);
      const totalMin = debts.reduce((s, d) => s + d.minimumPayment, 0);
      const available = Math.max(0, income.monthlyTakeHome - income.essentialExpenses - recurringTotal - totalMin + income.extraPayment);
      const accel = income.accelerationAmount != null ? Math.min(income.accelerationAmount, available) : available;
      const leftover = Math.max(0, available - accel);
      const bufferTarget = income.monthlyTakeHome * 0.1;
      if (leftover < bufferTarget && accel > 0) {
        items.push({
          id: 'guardrail-buffer',
          type: 'warning',
          icon: ShieldAlert,
          title: 'Low cash buffer',
          body: `Only $${leftover.toFixed(0)} left after acceleration — target is $${bufferTarget.toFixed(0)} (10% of take-home).`,
          tab: 'plan',
        });
      }
    }

    // 3. No income set yet
    if (!income && !incomeLoading) {
      items.push({
        id: 'no-income',
        type: 'info',
        icon: AlertTriangle,
        title: 'Set up your budget',
        body: 'Add your monthly income and expenses to unlock your payoff plan.',
        tab: 'income',
      });
    }

    // 4. No debts yet
    if (debts.length === 0 && !debtsLoading) {
      items.push({
        id: 'no-debts',
        type: 'info',
        icon: AlertTriangle,
        title: 'Add your first debt',
        body: 'Track your balances and build a personalised payoff schedule.',
        tab: 'debts',
      });
    }

    return items;
  }, [debts, income, expenses, debtsLoading, incomeLoading, settingsData?.preferences?.notifyDueDates, settingsData?.preferences?.notifyLowBuffer]);

  const urgentCount = notifications.filter((n) => n.type === 'urgent').length;
  const badgeCount = notifications.filter((n) => n.type !== 'info').length;

  const initials = user
    ? (user.name || user.email || 'U').slice(0, 2).toUpperCase()
    : 'U';

  const tabLabels: Record<Tab, string> = {
    debts: 'My Debts',
    income: 'Income & Budget',
    plan: 'Payoff Plan',
    intelligence: 'Planner Intelligence',
    documents: 'Import Documents',
    settings: 'Settings',
  };

  const notifTypeStyle: Record<Notification['type'], { bg: string; border: string; iconColor: string }> = {
    urgent: { bg: 'rgba(239,68,68,0.06)',    border: 'rgba(239,68,68,0.15)',    iconColor: '#ef4444' },
    warning:{ bg: 'rgba(245,158,11,0.06)',   border: 'rgba(245,158,11,0.18)',   iconColor: '#d97706' },
    info:   { bg: 'rgba(37,99,235,0.05)',    border: 'rgba(37,99,235,0.12)',    iconColor: '#2563eb' },
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f7fa' }}>

      {/* Sidebar */}
      <aside style={{
        width: '240px',
        flexShrink: 0,
        background: '#ffffff',
        borderRight: '1px solid rgba(15,23,42,0.07)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 40,
        transition: 'transform 0.25s ease',
        transform: sidebarOpen ? 'translateX(0)' : undefined,
      }}
      className="db-sidebar"
      >
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <Image src="/logo-dark.svg" alt="SnowballPay" width={148} height={28} priority />
          </a>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8', padding: '0 8px', marginBottom: '8px' }}>
            Main Menu
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id as Tab); setSidebarOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px', borderRadius: '10px', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: '13.5px',
                    fontWeight: isActive ? 600 : 400, textAlign: 'left', width: '100%',
                    transition: 'all 0.15s ease',
                    background: isActive ? '#eff6ff' : 'transparent',
                    color: isActive ? '#2563eb' : '#64748b',
                    position: 'relative',
                  }}
                >
                  {isActive && (
                    <span style={{
                      position: 'absolute', left: 0, top: '20%', bottom: '20%',
                      width: '3px', borderRadius: '0 3px 3px 0', background: '#2563eb',
                    }} />
                  )}
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div style={{ height: '1px', background: 'rgba(15,23,42,0.06)', margin: '16px 8px' }} />
          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8', padding: '0 8px', marginBottom: '8px' }}>
            Account
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <button
              onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '10px', border: 'none',
                fontSize: '13.5px', fontWeight: activeTab === 'settings' ? 600 : 400,
                color: activeTab === 'settings' ? '#2563eb' : '#64748b',
                background: activeTab === 'settings' ? '#eff6ff' : 'transparent',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%',
                transition: 'all 0.15s', position: 'relative',
              }}
            >
              {activeTab === 'settings' && (
                <span style={{
                  position: 'absolute', left: 0, top: '20%', bottom: '20%',
                  width: '3px', borderRadius: '0 3px 3px 0', background: '#2563eb',
                }} />
              )}
              <Settings size={16} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
              Settings
            </button>
          </div>
        </nav>

        {/* User + Logout */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(15,23,42,0.06)' }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', padding: '8px 10px' }}>
              {user.picture ? (
                <Image
                  src={user.picture}
                  alt={user.name ?? 'User'}
                  width={32}
                  height={32}
                  referrerPolicy="no-referrer"
                  style={{ borderRadius: '50%', width: '32px', height: '32px', objectFit: 'cover', border: '2px solid rgba(37,99,235,0.15)' }}
                />
              ) : (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eff6ff', border: '2px solid rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#2563eb', flexShrink: 0 }}>
                  {initials}
                </div>
              )}
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name?.split(' ')[0] || user.email?.split('@')[0] || 'User'}
                </p>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email || ''}
                </p>
              </div>
            </div>
          )}
          <a href="/auth/logout" style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '9px 12px', borderRadius: '9px',
            fontSize: '13px', fontWeight: 500, color: '#ef4444',
            textDecoration: 'none',
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.1)',
            width: '100%',
          }}>
            <LogOut size={14} />
            Sign Out
          </a>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', zIndex: 39 }}
        />
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }} className="db-main">

        {/* Top header */}
        <header style={{
          background: '#ffffff',
          borderBottom: '1px solid rgba(15,23,42,0.07)',
          padding: '0 24px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          gap: '16px',
        }}>
          {/* Mobile hamburger */}
          <button
            className="db-hamburger"
            onClick={() => setSidebarOpen(o => !o)}
            style={{
              display: 'none',
              background: 'transparent',
              border: '1px solid rgba(15,23,42,0.1)',
              borderRadius: '8px',
              padding: '7px',
              cursor: 'pointer',
              color: '#64748b',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Mobile logo */}
          <a href="/" className="db-mobile-logo" style={{ display: 'none', textDecoration: 'none', flexShrink: 0 }}>
            <Image src="/logo-dark.svg" alt="SnowballPay" width={130} height={26} />
          </a>

          {/* Page title */}
          <div className="db-page-title" style={{ flex: 1 }}>
            <h1 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {tabLabels[activeTab]}
            </h1>
          </div>

          {/* Right cluster */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>

            {/* Bell with notification panel */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setNotifOpen(o => !o)}
                style={{
                  background: notifOpen ? '#eff6ff' : '#f8fafc',
                  border: `1px solid ${notifOpen ? 'rgba(37,99,235,0.2)' : 'rgba(15,23,42,0.08)'}`,
                  borderRadius: '10px',
                  padding: '8px',
                  cursor: 'pointer',
                  color: notifOpen ? '#2563eb' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  transition: 'all 0.15s',
                }}
                aria-label="Notifications"
              >
                <Bell size={16} />
                {badgeCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    minWidth: '17px',
                    height: '17px',
                    borderRadius: '999px',
                    background: urgentCount > 0 ? '#ef4444' : '#f59e0b',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    border: '2px solid #ffffff',
                    lineHeight: 1,
                  }}>
                    {badgeCount}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {notifOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '320px',
                  background: '#ffffff',
                  border: '1px solid rgba(15,23,42,0.1)',
                  borderRadius: '16px',
                  boxShadow: '0 8px 32px rgba(15,23,42,0.12), 0 1px 4px rgba(15,23,42,0.06)',
                  zIndex: 100,
                  overflow: 'hidden',
                }}>
                  {/* Panel header */}
                  <div style={{
                    padding: '14px 16px 12px',
                    borderBottom: '1px solid rgba(15,23,42,0.07)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Notifications</span>
                    {badgeCount > 0 && (
                      <span style={{
                        fontSize: '11px', fontWeight: 600, color: '#64748b',
                        background: '#f1f5f9', borderRadius: '999px',
                        padding: '2px 8px',
                      }}>
                        {badgeCount} alert{badgeCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Notification list */}
                  <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                        <CheckCircle2 size={28} style={{ color: '#22c55e', margin: '0 auto 8px' }} />
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>All clear!</p>
                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>No upcoming payments or alerts.</p>
                      </div>
                    ) : (
                      <div style={{ padding: '8px' }}>
                        {notifications.map((notif) => {
                          const Icon = notif.icon;
                          const style = notifTypeStyle[notif.type];
                          return (
                            <button
                              key={notif.id}
                              onClick={() => {
                                if (notif.tab) setActiveTab(notif.tab);
                                setNotifOpen(false);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: `1px solid ${style.border}`,
                                background: style.bg,
                                cursor: notif.tab ? 'pointer' : 'default',
                                textAlign: 'left',
                                marginBottom: '6px',
                                transition: 'opacity 0.15s',
                                fontFamily: 'inherit',
                              }}
                            >
                              <Icon size={15} style={{ color: style.iconColor, flexShrink: 0, marginTop: '1px' }} />
                              <div>
                                <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: '0 0 2px', lineHeight: 1.3 }}>
                                  {notif.title}
                                </p>
                                <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                                  {notif.body}
                                </p>
                                {notif.tab && (
                                  <p style={{ fontSize: '11px', color: style.iconColor, margin: '4px 0 0', fontWeight: 600 }}>
                                    Go to {tabLabels[notif.tab]} →
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User avatar chip */}
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)', borderRadius: '10px', cursor: 'default' }}>
                {user.picture ? (
                  <Image
                    src={user.picture}
                    alt={user.name ?? 'User'}
                    width={26}
                    height={26}
                    referrerPolicy="no-referrer"
                    style={{ borderRadius: '50%', width: '26px', height: '26px', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#2563eb' }}>
                    {initials}
                  </div>
                )}
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }} className="db-username">
                  {user.name?.split(' ')[0] || user.email?.split('@')[0] || 'User'}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: '28px', width: '100%' }} className="db-content">
          <div key={activeTab} className="tab-fade-in">
            {activeTab === 'debts' && (
              <DebtTab debts={debts} isLoading={debtsLoading} />
            )}
            {activeTab === 'income' && (
              <IncomeTab
                income={income}
                expenses={expenses}
                debts={debts}
                isLoading={incomeLoading || expensesLoading}
              />
            )}
            {activeTab === 'plan' && (
              <PayoffTab
                debts={debts}
                income={income}
                expenses={expenses}
                isLoading={debtsLoading || incomeLoading}
              />
            )}
            {activeTab === 'intelligence' && (
              <IntelligenceTab
                debts={debts}
                income={income}
                expenses={expenses}
                isLoading={debtsLoading || incomeLoading}
              />
            )}
            {activeTab === 'documents' && (
              <DocumentImport />
            )}
            {activeTab === 'settings' && (
              <SettingsTab user={user} />
            )}
          </div>
        </main>
      </div>

      <style>{`
        .db-main { margin-left: 240px; }
        @media (max-width: 768px) {
          .db-main { margin-left: 0 !important; }
          .db-sidebar { transform: translateX(-100%); box-shadow: 4px 0 24px rgba(15,23,42,0.12); }
          .db-hamburger { display: flex !important; }
          .db-mobile-logo { display: block !important; }
          .db-page-title { display: none !important; }
          .db-username { display: none !important; }
          .db-content { padding: 16px !important; }
        }
      `}</style>
    </div>
  );
}
