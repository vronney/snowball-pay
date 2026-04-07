import {
  Html, Head, Body, Container, Section,
  Heading, Text, Button, Hr,
} from '@react-email/components';
import * as React from 'react';

interface MonthlyReviewEmailProps {
  userName?: string;
  totalBalance: number;
  debtCount: number;
  debtFreeDate?: string;
  monthName: string;
  unsubscribeUrl: string;
}

const BASE = 'https://getsnowballpay.com';

export default function MonthlyReviewEmail({
  userName = 'there',
  totalBalance,
  debtCount,
  debtFreeDate,
  monthName,
  unsubscribeUrl,
}: MonthlyReviewEmailProps) {
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <Html>
      <Head />
      <Body style={{ background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', background: '#ffffff', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(15,23,42,0.08)' }}>

          {/* Header */}
          <Section style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', padding: '32px 40px 28px' }}>
            <Heading style={{ color: '#ffffff', fontSize: '22px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
              SnowballPay
            </Heading>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', margin: 0 }}>
              {monthName} Review Reminder
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: '36px 40px' }}>
            <Heading style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              Time for your {monthName} check-in, {userName}
            </Heading>
            <Text style={{ fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 24px' }}>
              A fresh month is a great time to update your balances, review your plan, and make sure your snowball is still on track.
            </Text>

            {/* Snapshot card */}
            <Section style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px 24px', border: '1px solid rgba(15,23,42,0.08)', marginBottom: '28px' }}>
              <Text style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
                Current snapshot
              </Text>
              <Text style={{ fontSize: '15px', color: '#0f172a', margin: '0 0 6px' }}>
                <strong>Total remaining:</strong> {fmt(totalBalance)}
              </Text>
              <Text style={{ fontSize: '15px', color: '#0f172a', margin: '0 0 6px' }}>
                <strong>Active debts:</strong> {debtCount}
              </Text>
              {debtFreeDate && (
                <Text style={{ fontSize: '15px', color: '#0f172a', margin: 0 }}>
                  <strong>Projected debt-free:</strong> {debtFreeDate}
                </Text>
              )}
            </Section>

            {/* Checklist */}
            <Section style={{ background: '#fefce8', borderRadius: '12px', padding: '20px 24px', border: '1px solid rgba(234,179,8,0.2)', marginBottom: '28px' }}>
              <Text style={{ fontSize: '13px', fontWeight: 700, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                Monthly review checklist
              </Text>
              {[
                'Update balances to match your latest statements',
                'Check if your income or expenses changed',
                'Log any extra payments you made',
                'Celebrate any debts you paid off this month',
              ].map((item) => (
                <Text key={item} style={{ fontSize: '14px', color: '#713f12', margin: '0 0 6px', lineHeight: '1.5' }}>
                  ☐ {item}
                </Text>
              ))}
            </Section>

            <Button
              href={`${BASE}/dashboard`}
              style={{
                background: '#2563eb', color: '#ffffff', borderRadius: '10px',
                padding: '14px 28px', fontSize: '15px', fontWeight: 700,
                textDecoration: 'none', display: 'inline-block',
              }}
            >
              Open My Dashboard →
            </Button>

            <Hr style={{ border: 'none', borderTop: '1px solid rgba(15,23,42,0.08)', margin: '32px 0' }} />

            <Text style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.6' }}>
              Consistent monthly reviews are one of the highest-leverage habits for staying on track.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{ background: '#f8fafc', padding: '20px 40px', borderTop: '1px solid rgba(15,23,42,0.07)' }}>
            <Text style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 6px', textAlign: 'center' }}>
              © {new Date().getFullYear()} SnowballPay · noreply@getsnowballpay.com
            </Text>
            <Text style={{ fontSize: '12px', color: '#94a3b8', margin: 0, textAlign: 'center' }}>
              You&apos;re receiving this because you enabled monthly reminders.{' '}
              <a href={unsubscribeUrl} style={{ color: '#64748b' }}>Unsubscribe</a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
