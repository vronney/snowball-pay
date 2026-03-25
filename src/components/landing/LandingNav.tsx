'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function LandingNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="lp-nav" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 24px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo */}
          <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
            <Image src="/logo-dark.svg" alt="SnowballPay" width={168} height={32} priority />
          </a>

          {/* Center nav — desktop */}
          <div className="lp-hide-sm" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <a href="#features"    className="lp-nav-link">Features</a>
            <a href="#how-it-works" className="lp-nav-link">How It Works</a>
            <a href="#pricing"     className="lp-nav-link">Pricing</a>
            <a href="/calculator"  className="lp-nav-link">Calculator</a>
          </div>

          {/* CTA cluster — desktop */}
          <div className="lp-hide-sm" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isLoggedIn ? (
              <>
                <a href="/auth/logout" className="lp-nav-link" style={{ padding: '8px 14px' }}>
                  Sign Out
                </a>
                <a href="/dashboard" className="lp-btn lp-btn-primary" style={{ padding: '9px 20px', fontSize: '14px' }}>
                  Dashboard →
                </a>
              </>
            ) : (
              <>
                <a
                  href="/auth/login?returnTo=/dashboard"
                  className="lp-nav-link"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: '1px solid rgba(15,23,42,0.12)',
                    background: 'transparent',
                  }}
                >
                  Sign In
                </a>
                <a href="/auth/login?returnTo=/dashboard" className="lp-btn lp-btn-primary" style={{ padding: '9px 20px', fontSize: '14px' }}>
                  Get Started Free
                </a>
              </>
            )}
          </div>

          {/* Mobile: CTA + hamburger */}
          <div className="lp-show-sm" style={{ display: 'none', alignItems: 'center', gap: '10px' }}>
            <a
              href={isLoggedIn ? '/dashboard' : '/auth/login?returnTo=/dashboard'}
              className="lp-btn lp-btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              {isLoggedIn ? 'Dashboard' : 'Get Started'}
            </a>
            <button
              onClick={() => setMobileOpen(o => !o)}
              style={{
                background: '#f1f5f9',
                border: '1px solid rgba(15,23,42,0.1)',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div
            className="lp-show-sm"
            style={{
              display: 'none',
              borderTop: '1px solid rgba(15,23,42,0.07)',
              padding: '16px 24px 20px',
              flexDirection: 'column',
              gap: '2px',
              background: 'rgba(248,250,252,0.98)',
            }}
          >
            <a href="#features"     className="lp-mobile-link" onClick={() => setMobileOpen(false)}>Features</a>
            <a href="#how-it-works" className="lp-mobile-link" onClick={() => setMobileOpen(false)}>How It Works</a>
            <a href="#pricing"      className="lp-mobile-link" onClick={() => setMobileOpen(false)}>Pricing</a>
            <a href="/calculator"   className="lp-mobile-link" onClick={() => setMobileOpen(false)}>Calculator</a>
            <div style={{ height: '1px', background: 'rgba(15,23,42,0.07)', margin: '8px 0' }} />
            {isLoggedIn ? (
              <a href="/auth/logout" className="lp-mobile-link">Sign Out</a>
            ) : (
              <a href="/auth/login?returnTo=/dashboard" className="lp-mobile-link">Sign In</a>
            )}
          </div>
        )}
      </nav>

      <style>{`
        @media (max-width: 720px) {
          .lp-show-sm { display: flex !important; }
        }
      `}</style>
    </>
  );
}
