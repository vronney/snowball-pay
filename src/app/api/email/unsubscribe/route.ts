/**
 * GET /api/email/unsubscribe?userId=xxx&token=yyy
 *
 * One-click unsubscribe from notification emails (CAN-SPAM / GDPR compliant).
 * Token is HMAC-SHA256(userId, UNSUBSCRIBE_SECRET) — stateless, unforgeable.
 * Returns an HTML confirmation page (no login required).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyUnsubscribeToken } from '@/lib/unsubscribeToken';

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// All callers pass hardcoded string constants — escHtml guards against
// any future accidental interpolation of user-controlled data.
const page = (title: string, body: string, color: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)} — SnowballPay</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, system-ui, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .card { background: #fff; border-radius: 16px; border: 1px solid rgba(15,23,42,0.08); max-width: 480px; width: 100%; padding: 48px 40px; text-align: center; box-shadow: 0 4px 24px rgba(15,23,42,0.06); }
    .icon { font-size: 48px; margin-bottom: 20px; }
    h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 12px; letter-spacing: -0.02em; }
    p { font-size: 15px; color: #475569; line-height: 1.7; margin-bottom: 28px; }
    a { display: inline-block; background: ${color}; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="card">
    ${body}
    <a href="https://getsnowballpay.com/dashboard">Go to my dashboard</a>
  </div>
</body>
</html>`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') ?? '';
  const token  = searchParams.get('token') ?? '';

  if (!userId || !token || !verifyUnsubscribeToken(userId, token)) {
    return new NextResponse(
      page(
        'Invalid link',
        `<div class="icon">⚠️</div>
         <h1>Invalid or expired link</h1>
         <p>This unsubscribe link is invalid. You can manage your notification preferences from your dashboard settings.</p>`,
        '#64748b',
      ),
      { status: 400, headers: { 'Content-Type': 'text/html' } },
    );
  }

  try {
    await prisma.userPreferences.upsert({
      where:  { userId },
      update: { emailOptOut: true },
      create: { userId, emailOptOut: true },
    });

    return new NextResponse(
      page(
        'Unsubscribed',
        `<div class="icon">✅</div>
         <h1>You&apos;ve been unsubscribed</h1>
         <p>You&apos;ll no longer receive weekly or monthly notification emails from SnowballPay. You can re-enable them anytime from your settings.</p>`,
        '#2563eb',
      ),
      { status: 200, headers: { 'Content-Type': 'text/html' } },
    );
  } catch {
    return new NextResponse(
      page(
        'Error',
        `<div class="icon">❌</div>
         <h1>Something went wrong</h1>
         <p>We couldn&apos;t process your request. Please try again or manage preferences from your dashboard.</p>`,
        '#ef4444',
      ),
      { status: 500, headers: { 'Content-Type': 'text/html' } },
    );
  }
}
