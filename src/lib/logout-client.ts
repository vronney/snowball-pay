"use client";

import { resetIdentity } from "@/lib/analytics";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/+$/, "");

export const LOGOUT_URL = APP_URL
  ? `/auth/logout?returnTo=${encodeURIComponent(APP_URL)}&federated=true`
  : "/auth/logout";

function clearStorageWithPrefix(storage: Storage, prefix: string) {
  const keysToRemove: string[] = [];

  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
}

export function runLogoutClientCleanup() {
  resetIdentity();

  try {
    clearStorageWithPrefix(localStorage, "sp_");
  } catch {
    // ignore storage access failures
  }

  try {
    clearStorageWithPrefix(sessionStorage, "sp_");
  } catch {
    // ignore storage access failures
  }
}
