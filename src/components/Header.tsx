'use client';

import Image from 'next/image';
import { LogOut } from 'lucide-react';
import { LOGOUT_URL, runLogoutClientCleanup } from '@/lib/logout-client';

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
    <header className="px-6 pt-6 pb-4 max-w-4xl mx-auto" style={{ borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
      <div className="flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center">
          <Image src="/logo-dark.svg" alt="SnowballPay" width={177} height={34} priority />
        </div>

        {/* User info + logout */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {user.picture ? (
                <Image
                  src={user.picture}
                  alt={user.name ?? 'User'}
                  width={32}
                  height={32}
                  referrerPolicy="no-referrer"
                  className="rounded-full object-cover border border-slate-200"
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
              href={LOGOUT_URL}
              onClick={runLogoutClientCleanup}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors text-slate-600"
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
