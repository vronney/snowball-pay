import { Section, Heading, Text, Button } from '@react-email/components';
import * as React from 'react';
import EmailLayout from '@/emails/EmailLayout';

interface WeeklyDigestEmailProps {
  userName?: string;
  weeklyPaymentCount: number;
  weeklyAmountPaid: number;
  bestMilestoneLabel?: string | null;
  recentMessage?: string;
  unsubscribeUrl: string;
}

const MILESTONE_DISPLAY: Record<string, string> = {
  first_payment:     'First payment',
  debt_paid_off:     'Debt paid off 🎉',
  quarter_paid:      '25% of total debt paid',
  half_paid:         '50% of total debt paid',
  three_quarter:     '75% of total debt paid',
  streak_six_months: '6-month payment streak',
  anniversary:       '1-year anniversary',
};

const BASE = 'https://getsnowballpay.com';

export default function WeeklyDigestEmail({
  userName = 'there', weeklyPaymentCount, weeklyAmountPaid, bestMilestoneLabel, recentMessage, unsubscribeUrl,
}: WeeklyDigestEmailProps) {
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  const milestoneDisplay = bestMilestoneLabel
    ? (MILESTONE_DISPLAY[bestMilestoneLabel] ?? bestMilestoneLabel)
    : null;

  return (
    <EmailLayout
      headerGradient="linear-gradient(135deg, #0f172a, #1e293b)"
      headerTitle="SnowballPay"
      headerSubtitle="Your debt week in review"
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section style={{ padding: '36px 40px' }}>
        <Heading style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Hey {userName} 👋
        </Heading>
        <Text style={{ fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 28px' }}>
          You paid {fmt(weeklyAmountPaid)} this week.{' '}
          {weeklyPaymentCount === 1 ? 'One payment logged.' : `${weeklyPaymentCount} payments logged.`}{' '}
          Here&apos;s what SnowballPay noticed.
        </Text>
        {milestoneDisplay && (
          <Section style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
            <Text style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px' }}>Milestone this week</Text>
            <Text style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{milestoneDisplay}</Text>
          </Section>
        )}
        {recentMessage && (
          <Section style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px 20px', marginBottom: '28px', borderLeft: '3px solid #2563eb' }}>
            <Text style={{ fontSize: '14px', color: '#334155', lineHeight: '1.65', margin: 0, fontStyle: 'italic' }}>
              &ldquo;{recentMessage}&rdquo;
            </Text>
          </Section>
        )}
        <Button href={`${BASE}/dashboard?tab=journey`} style={{ background: '#2563eb', color: '#ffffff', borderRadius: '10px', padding: '12px 24px', fontSize: '14px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
          See your journey →
        </Button>
      </Section>
    </EmailLayout>
  );
}

WeeklyDigestEmail.PreviewProps = {
  weeklyPaymentCount: 2,
  weeklyAmountPaid: 640,
  bestMilestoneLabel: 'half_paid',
  recentMessage: 'Knocking out credit cards first frees up cash fast.',
  unsubscribeUrl: 'https://getsnowballpay.com/unsubscribe',
} satisfies Parameters<typeof WeeklyDigestEmail>[0];
