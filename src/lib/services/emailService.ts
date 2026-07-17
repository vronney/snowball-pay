/**
 * Email Service Layer
 * Centralizes email sending operations, authorization, and tracking.
 * Used by cron jobs and scheduled email routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';

/**
 * Verify cron request is authorized
 * Returns: error response if unauthorized, null if authorized
 */
export function verifyCronRequest(request: NextRequest): NextResponse | null {
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) return null; // Allow in development

  const secret = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

/**
 * Get Resend client instance
 * Returns: Resend instance if configured, null otherwise
 */
export function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

/**
 * Send email using Resend
 * Handles error logging transparently
 */
export async function sendEmail(
  to: string,
  from: string,
  subject: string,
  html: string,
  options: { idempotencyKey?: string } = {},
): Promise<{ success: boolean; id?: string; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: 'email_not_configured' };
  }

  try {
    const response = await resend.emails.send(
      { from, to, subject, html },
      options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined,
    );
    if (response.error) {
      const errorMsg = response.error.message || 'email_provider_error';
      console.error('[email send error]', { subject, error: errorMsg });
      return { success: false, error: errorMsg };
    }
    return { success: true, id: response.data?.id };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[email send error]', { subject, error: errorMsg });
    return { success: false, error: errorMsg };
  }
}

/**
 * Mark an email as sent in user preferences
 * Creates preference record if it doesn't exist
 */
export async function markEmailSent(
  userId: string,
  checkKey: string,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: { select: { id: true, actionChecks: true } } },
  });

  if (!user) return;

  const checks = (user.preferences?.actionChecks ?? {}) as Record<string, boolean>;
  const updated = { ...checks, [checkKey]: true };

  if (user.preferences?.id) {
    await prisma.userPreferences.update({
      where: { id: user.preferences.id },
      data: { actionChecks: updated },
    });
  } else {
    await prisma.userPreferences.create({
      data: { userId, actionChecks: updated },
    });
  }
}

/**
 * Check if email was already sent (in actionChecks)
 */
export async function isEmailAlreadySent(
  userId: string,
  checkKey: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: { select: { actionChecks: true } } },
  });

  if (!user?.preferences) return false;
  const checks = (user.preferences.actionChecks ?? {}) as Record<string, boolean>;
  return checks[checkKey] === true;
}

/**
 * CronResult type for consistent cron endpoint responses
 */
export interface CronResult {
  ok?: boolean;
  skipped?: boolean;
  reason?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Handle missing Resend configuration
 * Returns error response for cron
 */
export const MISSING_RESEND_CONFIG = {
  skipped: true,
  reason: 'email_not_configured',
} as const;

export function handleMissingResendConfig(): NextResponse {
  return NextResponse.json(MISSING_RESEND_CONFIG);
}
