import { Section, Heading, Text, Button, Hr, Row, Column } from '@react-email/components';
import * as React from 'react';
import EmailLayout from '@/emails/EmailLayout';

interface WeeklyProgressEmailProps {
  userName?: string;
  totalBalance: number;
  totalPaidThisMonth: number;
  paymentsCount: number;
  debtFreeDate?: string;
  unsubscribeUrl: string;
}

const BASE = 'https://getsnowballpay.com';

export default function WeeklyProgressEmail({
  userName = 'there', totalBalance, totalPaidThisMonth, paymentsCount, debtFreeDate, unsubscribeUrl,
}: WeeklyProgressEmailProps) {
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

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
} satisfies Parameters<typeof WeeklyProgressEmail>[0];
