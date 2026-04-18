import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';
import { badRequest, serverError } from '@/lib/auth-server';
import { limits } from '@/lib/rateLimit';

const supportSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(180),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(4000),
  // Honeypot field: real users should leave this empty.
  website: z.string().max(0).optional(),
});

const TO_EMAIL = 'support@getsnowballpay.com';
const FROM_EMAIL = 'SnowballPay <noreply@getsnowballpay.com>';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getClientKey(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown';
  const ua = (request.headers.get('user-agent') || 'unknown').slice(0, 120);
  return `${ip}:${ua}`;
}

export async function POST(request: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'Support email is temporarily unavailable. Please try again later.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const parsed = supportSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('Please provide valid support details.');
  }

  const { name, email, subject, message, website } = parsed.data;
  if (website && website.length > 0) {
    // Pretend success for bots to reduce probing.
    return NextResponse.json({ sent: true });
  }

  if (!(await limits.supportContact(getClientKey(request)))) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a few minutes and try again.' },
      { status: 429 },
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replaceAll('\n', '<br />');

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      subject: `[Support] ${subject}`,
      html: `
        <h2>New SnowballPay Support Request</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Subject:</strong> ${safeSubject}</p>
        <p><strong>Message:</strong><br />${safeMessage}</p>
      `,
      text: [
        'New SnowballPay Support Request',
        `Name: ${name}`,
        `Email: ${email}`,
        `Subject: ${subject}`,
        '',
        'Message:',
        message,
      ].join('\n'),
    });

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error('[support contact] failed', error);
    return serverError('Failed to send support request');
  }
}
