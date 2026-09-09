import * as SecureStore from 'expo-secure-store';
import { refreshAsync, type TokenResponse } from 'expo-auth-session';
import { config } from './config';

/**
 * Auth0 tokens live in the device keychain (expo-secure-store) — never
 * AsyncStorage. This module is React-free so the API client can read tokens
 * without touching the provider.
 */

const KEY = 'sp.auth.session.v1';
const REFRESH_SKEW_MS = 60 * 1000;

export interface StoredSession {
  accessToken: string;
  refreshToken?: string;
  /** Epoch ms. */
  expiresAt: number;
}

let memo: StoredSession | null | undefined;
let refreshing: Promise<StoredSession | null> | null = null;

export function sessionFromToken(token: TokenResponse): StoredSession {
  const issuedAt = (token.issuedAt ?? Math.floor(Date.now() / 1000)) * 1000;
  const ttl = (token.expiresIn ?? 3600) * 1000;
  return {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt: issuedAt + ttl,
  };
}

export async function loadSession(): Promise<StoredSession | null> {
  if (memo !== undefined) return memo;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    memo = raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    memo = null;
  }
  return memo;
}

export async function saveSession(session: StoredSession): Promise<void> {
  memo = session;
  await SecureStore.setItemAsync(KEY, JSON.stringify(session), {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}

/** Rejects if the keychain refuses the delete — never report signed-out while a token persists. */
export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
  memo = null;
}

async function refreshSession(session: StoredSession): Promise<StoredSession | null> {
  if (!session.refreshToken) return null;
  try {
    const token = await refreshAsync(
      { clientId: config.auth0ClientId, refreshToken: session.refreshToken },
      { tokenEndpoint: `https://${config.auth0Domain}/oauth/token` },
    );
    const next = sessionFromToken(token);
    // Auth0 rotates refresh tokens; keep the old one only if none came back.
    if (!next.refreshToken) next.refreshToken = session.refreshToken;
    await saveSession(next);
    return next;
  } catch {
    await clearSession();
    return null;
  }
}

/** Valid access token, refreshed when within a minute of expiry. Null = signed out. */
export async function getAccessToken(): Promise<string | null> {
  const session = await loadSession();
  if (!session) return null;
  if (session.expiresAt - REFRESH_SKEW_MS > Date.now()) return session.accessToken;
  refreshing ??= refreshSession(session).finally(() => {
    refreshing = null;
  });
  const next = await refreshing;
  return next?.accessToken ?? null;
}
