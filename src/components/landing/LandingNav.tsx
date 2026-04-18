"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { track, Events } from "@/lib/analytics";
import { LOGOUT_URL, runLogoutClientCleanup } from "@/lib/logout-client";

const navItems = [
  { label: "Features", href: "/#features" },
  { label: "Learn", href: "/learn" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Calculator", href: "/calculator" },
];

function ArrowIsland() {
  return (
    <span className="lp-btn-arrow">
      <span>{">"}</span>
    </span>
  );
}

export default function LandingNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [mobileOpen]);

  return (
    <>
      <nav className="lp-nav-shell">
        <div className="lp-nav-inner">
          <a href="/" className="lp-nav-brand" aria-label="SnowballPay home">
            <Image
              src="/logo-dark.svg"
              alt="SnowballPay"
              width={168}
              height={32}
              priority
            />
          </a>

          <div className="lp-hide-sm lp-nav-links">
            {navItems.map((item) => (
              <a key={item.label} href={item.href} className="lp-nav-link">
                {item.label}
              </a>
            ))}
          </div>

          <div className="lp-hide-sm lp-nav-cta">
            {isLoggedIn ? (
              <>
                <a href={LOGOUT_URL} className="lp-nav-signin" onClick={runLogoutClientCleanup}>
                  Sign Out
                </a>
                <a href="/dashboard" className="lp-btn lp-btn-primary lp-btn-with-icon">
                  Dashboard
                  <ArrowIsland />
                </a>
              </>
            ) : (
              <>
                <a href="/auth/login?returnTo=/dashboard" className="lp-nav-signin">
                  Sign In
                </a>
                <a
                  href="/auth/login?returnTo=/dashboard"
                  className="lp-btn lp-btn-primary lp-btn-with-icon"
                  onClick={() => track(Events.SIGNUP_STARTED, { source: "nav" })}
                >
                  Get Started Free
                  <ArrowIsland />
                </a>
              </>
            )}
          </div>

          <div className="lp-show-sm lp-nav-mobile">
            <a
              href={isLoggedIn ? "/dashboard" : "/auth/login?returnTo=/dashboard"}
              className="lp-btn lp-btn-primary lp-nav-mobile-cta"
              onClick={
                isLoggedIn
                  ? undefined
                  : () => track(Events.SIGNUP_STARTED, { source: "nav_mobile" })
              }
            >
              {isLoggedIn ? "Dashboard" : "Start Free"}
            </a>

            <button
              type="button"
              className={`lp-menu-btn ${mobileOpen ? "is-open" : ""}`}
              aria-expanded={mobileOpen}
              aria-label="Toggle menu"
              onClick={() => setMobileOpen((prev) => !prev)}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </nav>

      <div className={`lp-nav-overlay ${mobileOpen ? "is-open" : ""}`} aria-hidden={!mobileOpen}>
        <div className="lp-nav-overlay-panel">
          <p className="lp-nav-overlay-eyebrow">Navigation</p>

          <div className="lp-nav-overlay-links">
            {navItems.map((item, index) => (
              <a
                key={item.label}
                href={item.href}
                className="lp-mobile-link"
                style={{ transitionDelay: `${120 + index * 50}ms` }}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="lp-nav-overlay-divider" />

          <div className="lp-nav-overlay-actions">
            {isLoggedIn ? (
              <>
                <a href="/dashboard" className="lp-btn lp-btn-primary lp-btn-with-icon" onClick={() => setMobileOpen(false)}>
                  Open Dashboard
                  <ArrowIsland />
                </a>
                <a
                  href={LOGOUT_URL}
                  className="lp-nav-signin"
                  onClick={() => {
                    runLogoutClientCleanup();
                    setMobileOpen(false);
                  }}
                >
                  Sign Out
                </a>
              </>
            ) : (
              <>
                <a
                  href="/auth/login?returnTo=/dashboard"
                  className="lp-btn lp-btn-primary lp-btn-with-icon"
                  onClick={() => {
                    track(Events.SIGNUP_STARTED, { source: "nav_mobile_overlay" });
                    setMobileOpen(false);
                  }}
                >
                  Create Free Account
                  <ArrowIsland />
                </a>
                <a
                  href="/auth/login?returnTo=/dashboard"
                  className="lp-nav-signin"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign In
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
