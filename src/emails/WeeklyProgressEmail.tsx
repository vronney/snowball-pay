import { Section, Heading, Text, Button, Hr, Row, Column } from '@react-email/components';
import * as React from 'react';
import EmailLayout from '@/emails/EmailLayout';

interface CoachBriefSummary {
  status: 'on_track' | 'at_risk' | 'off_track';
  headline: string;
  summary: string;
  actionTitle: string;
  action: string;
}

interface WeeklyProgressEmailProps {
  userName?: string;
  totalBalance: number;
  totalPaidThisMonth: number;
  paymentsCount: number;
  debtFreeDate?: string;
  unsubscribeUrl: string;
  // AI Coach Brief — same law-checked source as the in-app card. Omitted
  // entirely when no lawful cached brief exists for this user; never
  // generated inline here (this is a read of the existing cache only).
  coachBrief?: CoachBriefSummary | null;
}

const BASE = 'https://getsnowballpay.com';

const COACH_PALETTE: Record<CoachBriefSummary['status'], { bg: string; border: string; color: string; label: string }> = {
  on_track:  { bg: '#f0fdf4', border: 'rgba(5,150,105,0.18)',  color: '#059669', label: 'On track' },
  at_risk:   { bg: '#fffbeb', border: 'rgba(217,119,6,0.22)',  color: '#b45309', label: 'At risk' },
  off_track: { bg: '#fef2f2', border: 'rgba(220,38,38,0.2)',   color: '#b91c1c', label: 'Off track' },
};

export default function WeeklyProgressEmail({
  userName = 'there', totalBalance, totalPaidThisMonth, paymentsCount, debtFreeDate, unsubscribeUrl, coachBrief,
}: WeeklyProgressEmailProps) {
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const coachPalette = coachBrief ? COACH_PALETTE[coachBrief.status] : null;

  return (
    <EmailLayout
      headerGradient="linear-gradient(135deg, #1d4ed8, #2563eb)"
      headerTitle="SnowballPay"
      headerSubtitle="Weekly Progress Summary"
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section style={{ padding: '36px 40px' }}>
        <Heading style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Your week in review, {userName}
        </Heading>
        <Text style={{ fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 28px' }}>
          Here&apos;s a snapshot of your debt payoff progress this week.
        </Text>
        <Row style={{ marginBottom: '24px' }}>
          <Column style={{ width: '50%', paddingRight: '8px' }}>
            <Section style={{ background: '#f0fdf4', borderRadius: '12px', padding: '18px 20px', border: '1px solid rgba(5,150,105,0.15)' }}>
              <Text style={{ fontSize: '11px', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Paid this month</Text>
              <Text style={{ fontSize: '22px', fontWeight: 900, color: '#065f46', margin: '0 0 2px', letterSpacing: '-0.03em' }}>{fmt(totalPaidThisMonth)}</Text>
              <Text style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{paymentsCount} payment{paymentsCount !== 1 ? 's' : ''} recorded</Text>
            </Section>
          </Column>
          <Column style={{ width: '50%', paddingLeft: '8px' }}>
            <Section style={{ background: '#eff6ff', borderRadius: '12px', padding: '18px 20px', border: '1px solid rgba(37,99,235,0.15)' }}>
              <Text style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Total remaining</Text>
              <Text style={{ fontSize: '22px', fontWeight: 900, color: '#1e3a8a', margin: '0 0 2px', letterSpacing: '-0.03em' }}>{fmt(totalBalance)}</Text>
              {debtFreeDate && <Text style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Free by {debtFreeDate}</Text>}
            </Section>
          </Column>
        </Row>
        {coachBrief && coachPalette && (
          <Section style={{ background: coachPalette.bg, border: `1px solid ${coachPalette.border}`, borderRadius: '12px', padding: '18px 20px', marginBottom: '24px' }}>
            <Text style={{ fontSize: '11px', fontWeight: 700, color: coachPalette.color, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
              AI Coach · {coachPalette.label}
            </Text>
            <Text style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
              {coachBrief.headline}
            </Text>
            <Text style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', margin: '0 0 10px' }}>
              {coachBrief.summary}
            </Text>
            <Text style={{ fontSize: '13px', color: '#0f172a', lineHeight: '1.6', margin: 0 }}>
              <span style={{ fontWeight: 700 }}>Best move this month: </span>
              {coachBrief.actionTitle} — {coachBrief.action}
            </Text>
          </Section>
        )}
        <Button href={`${BASE}/dashboard`} style={{ background: '#2563eb', color: '#ffffff', borderRadius: '10px', padding: '14px 28px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
          View My Plan →
        </Button>
        <Hr style={{ border: 'none', borderTop: '1px solid rgba(15,23,42,0.08)', margin: '32px 0' }} />
        <Text style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.6' }}>
          Keep going — every payment compounds. The snowball is rolling.
        </Text>
      </Section>
    </EmailLayout>
  );
}

WeeklyProgressEmail.PreviewProps = {
  totalBalance: 18450,
  totalPaidThisMonth: 640,
  paymentsCount: 3,
  debtFreeDate: 'March 2027',
  unsubscribeUrl: 'https://getsnowballpay.com/unsubscribe',
  coachBrief: {
    status: 'at_risk',
    headline: 'Pace has slipped behind plan',
    summary: 'Debt is down $120 this month vs a planned $310 — about $190 behind pace.',
    actionTitle: 'Confirm this month’s payment',
    action: 'Log the Delta Amex payment so the plan reflects reality.',
  },
} satisfies Parameters<typeof WeeklyProgressEmail>[0];
