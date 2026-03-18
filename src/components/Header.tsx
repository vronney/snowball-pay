'use client';

import { Snowflake, LogOut } from 'lucide-react';

type UserInfo = {
  name?: string | null;
  email?: string | null;
  picture?: string | null;
};

export default function Header({ user }: { user?: UserInfo | null }) {
  const initials = user
    ? (user.name || user.email || 'U')[0].toUpperCase()
    : null;

  return (
    <header className="px-6 pt-6 pb-4 max-w-4xl mx-auto border-b border-white/10">
      <div className="flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#3b82f6' }}
          >
            <Snowflake size={22} color="#fff" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">Debt Snowball Planner</h1>
            <p className="text-xs opacity-50">Take control of your finances</p>
          </div>
        </div>

        {/* User info + logout */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name ?? 'User'}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover border border-white/10"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                  {initials}
                </div>
              )}
              <span className="text-sm font-medium hidden sm:inline opacity-90">
                {user.name || user.email}
              </span>
            </div>

            <a
              href="/auth/logout"
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
