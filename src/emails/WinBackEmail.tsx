import {
  Html, Head, Body, Container, Section,
  Heading, Text, Button, Hr,
} from '@react-email/components';
import * as React from 'react';

interface WinBackEmailProps {
  userName?: string;
  totalBalance: number;
  debtFreeDate?: string;
  daysSinceActivity: number;
  unsubscribeUrl: string;
}

const BASE = 'https://getsnowballpay.com';

export default function WinBackEmail({
  userName = 'there',
  totalBalance,
  debtFreeDate,
  daysSinceActivity,
  unsubscribeUrl,
}: WinBackEmailProps) {
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <Html>
      <Head />
      <Body style={{ background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', background: '#ffffff', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(15,23,42,0.08)' }}>

          {/* Header */}
          <Section style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', padding: '32px 40px 28px' }}>
            <Heading style={{ color: '#ffffff', fontSize: '22px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
              SnowballPay
            </Heading>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: 0 }}>
              Your plan is still waiting for you
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: '36px 40px' }}>
            <Heading style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              Hey {userName}, your snowball stopped rolling
            </Heading>
            <Text style={{ fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 24px' }}>
              It&apos;s been {daysSinceActivity} days since you last checked in. Your debt is still there — but so is your plan.
            </Text>

            {/* Balance card */}
            <Section style={{ background: '#eff6ff', borderRadius: '12px', padding: '20px 24px', border: '1px solid rgba(37,99,235,0.15)', marginBottom: '24px' }}>
              <Text style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
                Your current balance
              </Text>
              <Text style={{ fontSize: '28px', fontWeight: 900, color: '#1e3a8a', margin: '0 0 4px', letterSpacing: '-0.03em' }}>
                {fmt(totalBalance)}
              </Text>
              {debtFreeDate && (
                <Text style={{ fontSize: '13px', color: '#3b82f6', margin: 0, fontWeight: 600 }}>
                  You could be debt-free by {debtFreeDate} — get back on track.
                </Text>
              )}
            </Section>

            <Text style={{ fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 24px' }}>
              Every week you don&apos;t accelerate is interest you&apos;re paying needlessly. Five minutes to review your plan is all it takes.
            </Text>

            <Button
              href={`${BASE}/dashboard`}
              style={{
                background: '#2563eb', color: '#ffffff', borderRadius: '10px',
                padding: '14px 28px', fontSize: '15px', fontWeight: 700,
                textDecoration: 'none', display: 'inline-block',
              }}
            >
              Resume My Payoff Plan →
            </Button>

            <Hr style={{ border: 'none', borderTop: '1px solid rgba(15,23,42,0.08)', margin: '32px 0' }} />

            <Text style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.6' }}>
              The snowball method works best with consistent momentum. You&apos;ve already done the hard part — you started.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{ background: '#f8fafc', padding: '20px 40px', borderTop: '1px solid rgba(15,23,42,0.07)' }}>
            <Text style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 6px', textAlign: 'center' }}>
              © {new Date().getFullYear()} SnowballPay · noreply@getsnowballpay.com
            </Text>
            <Text style={{ fontSize: '12px', color: '#94a3b8', margin: 0, textAlign: 'center' }}>
              You&apos;re receiving this because you have an active SnowballPay account.{' '}
              <a href={unsubscribeUrl} style={{ color: '#64748b' }}>Unsubscribe</a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
