import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  exchangeCodeAsync,
  makeRedirectUri,
  useAuthRequest,
  useAutoDiscovery,
} from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useQueryClient } from '@tanstack/react-query';
import { authConfigured, config } from './config';
import { clearSession, loadSession, saveSession, sessionFromToken } from './tokens';

WebBrowser.maybeCompleteAuthSession();

/**
 * Auth0 native sign-in (Authorization Code + PKCE) against the SAME tenant
 * the web app uses, requesting an access token for the mobile API audience.
 * The resulting bearer is what src/lib/mobileAuth.ts verifies server-side.
 */

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: Status;
  /** Opens the Auth0 login; resolves true on success. */
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
  /** Called by the API layer when a 401 proves the token is dead. */
  invalidate: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const redirectUri = makeRedirectUri({ scheme: config.scheme, path: 'auth/callback' });

/**
 * Builds without Auth0 env (a bare calculator preview) must not kick off
 * OIDC discovery against "https://" — the hooks only mount when configured.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return authConfigured ? (
    <ConfiguredAuthProvider>{children}</ConfiguredAuthProvider>
  ) : (
    <UnconfiguredAuthProvider>{children}</UnconfiguredAuthProvider>
  );
}

function UnconfiguredAuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  useEffect(() => {
    loadSession().then((session) => setStatus(session ? 'signedIn' : 'signedOut'));
  }, []);
  const signOut = useCallback(async () => {
    await clearSession();
    setStatus('signedOut');
  }, []);
  const value = useMemo<AuthContextValue>(
    () => ({ status, signIn: async () => false, signOut, invalidate: signOut }),
    [status, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function ConfiguredAuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const queryClient = useQueryClient();
  const discovery = useAutoDiscovery(`https://${config.auth0Domain}`);

  const [request, , promptAsync] = useAuthRequest(
    {
      clientId: config.auth0ClientId,
      redirectUri,
      responseType: 'code',
      usePKCE: true,
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      extraParams: { audience: config.auth0Audience },
    },
    discovery,
  );

  useEffect(() => {
    loadSession().then((session) => setStatus(session ? 'signedIn' : 'signedOut'));
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    queryClient.clear();
    setStatus('signedOut');
  }, [queryClient]);

  const signIn = useCallback(async () => {
    if (!request || !discovery) return false;
    // Ephemeral session: no shared browser cookies, so sign-out is just
    // dropping our tokens and the next sign-in always shows the login form.
    const result = await promptAsync({ preferEphemeralSession: true });
    if (result.type !== 'success' || !result.params.code) return false;
    try {
      const token = await exchangeCodeAsync(
        {
          clientId: config.auth0ClientId,
          code: result.params.code,
          redirectUri,
          extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : {},
        },
        discovery,
      );
      await saveSession(sessionFromToken(token));
      queryClient.clear();
      setStatus('signedIn');
      return true;
    } catch {
      return false;
    }
  }, [discovery, promptAsync, queryClient, request]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, signIn, signOut, invalidate: signOut }),
    [status, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
