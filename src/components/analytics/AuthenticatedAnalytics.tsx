'use client';

import { useEffect } from 'react';
import { identify } from '@/lib/analytics';

interface AuthenticatedAnalyticsProps {
  userId: string | null;
}

export function AuthenticatedAnalytics({ userId }: AuthenticatedAnalyticsProps) {
  useEffect(() => {
    if (userId) identify(userId, { is_authenticated: true });
  }, [userId]);

  return null;
}
