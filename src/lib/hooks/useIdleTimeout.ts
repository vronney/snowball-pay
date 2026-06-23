"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { runLogoutClientCleanup, LOGOUT_URL } from "@/lib/logout-client";

const IDLE_MS = 20 * 60 * 1000;
const WARN_BEFORE_MS = 60 * 1000;

export function useIdleTimeout() {
  const [warning, setWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const warnTimer = useRef<ReturnType<typeof setTimeout>>();

  const logout = useCallback(() => {
    runLogoutClientCleanup();
    window.location.href = LOGOUT_URL;
  }, []);

  const reset = useCallback(() => {
    setWarning(false);
    clearTimeout(idleTimer.current);
    clearTimeout(warnTimer.current);
    warnTimer.current = setTimeout(() => setWarning(true), IDLE_MS - WARN_BEFORE_MS);
    idleTimer.current = setTimeout(logout, IDLE_MS);
  }, [logout]);

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      clearTimeout(idleTimer.current);
      clearTimeout(warnTimer.current);
    };
  }, [reset]);

  useEffect(() => {
    if (!warning) { setCountdown(60); return; }
    const interval = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(interval);
  }, [warning]);

  return { warning, countdown, stayLoggedIn: reset, logout };
}
