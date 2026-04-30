import { Section, Heading, Text, Button, Hr, Row, Column } from '@react-email/components';
import * as React from 'react';
import EmailLayout from '@/emails/EmailLayout';

interface DueDateDebt {
  name: string;
  minimumPayment: number;
}

interface DueDateReminderEmailProps {
  userName?: string;
  debts: DueDateDebt[];
  dueDateLabel: string;
  daysUntilDue: number;
  streak: number;
  unsubscribeUrl: string;
}

const BASE = 'https://getsnowballpay.com';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function DueDateReminderEmail({
  userName = 'there',
  debts,
  dueDateLabel,
  daysUntilDue,
  streak,
  unsubscribeUrl,
}: DueDateReminderEmailProps) {
  const isSingle   = debts.length === 1;
  const total      = debts.reduce((s, d) => s + d.minimumPayment, 0);
  const urgency    = daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue} days`;
  const headerTitle = isSingle
    ? `${debts[0].name} is due ${urgency}`
    : `${debts.length} payments due ${urgency}`;
  const headerSubtitle = isSingle
    ? `Minimum payment: ${fmt(debts[0].minimumPayment)}`
    : `${fmt(total)} total due`;

  return (
    <EmailLayout
      headerGradient="linear-gradient(135deg, #0f172a, #1e3a5f)"
      headerTitle={headerTitle}
      headerSubtitle={headerSubtitle}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section style={{ padding: '32px 40px 0' }}>
        <Section style={{ background: '#fef2f2', borderRadius: '12px', padding: '20px 24px', border: '1px solid rgba(239,68,68,0.15)', textAlign: 'center' }}>
          <Text style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>
            Due {dueDateLabel}
          </Text>
          <Heading style={{ fontSize: '36px', fontWeight: 900, color: '#7f1d1d', margin: 0, letterSpacing: '-0.04em' }}>
            {fmt(total)}
          </Heading>
        </Section>
      </Section>

      <Section style={{ padding: '28px 40px 0' }}>
        <Heading style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          {streak > 0 ? `Don't break the streak, ${userName}.` : `Time to log it, ${userName}.`}
        </Heading>
        <Text style={{ fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 24px' }}>
          {streak > 0
            ? `You've logged payments for ${streak} month${streak === 1 ? '' : 's'} straight. Log ${isSingle ? 'it' : 'them'} after you pay to keep the streak alive.`
            : `${isSingle ? `Your ${debts[0].name} minimum of ${fmt(debts[0].minimumPayment)} is` : `These payments are`} due on ${dueDateLabel}. Log ${isSingle ? 'it' : 'them'} after you pay to keep your debt-free date accurate.`}
        </Text>

        {!isSingle && (
          <Section style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px', overflow: 'hidden' }}>
            {debts.map((debt, i) => (
              <Row
                key={debt.name}
                style={{ padding: '12px 20px', borderBottom: i < debts.length - 1 ? '1px solid #f1f5f9' : 'none' }}
              >
                <Column>
                  <Text style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                    {debt.name}
                  </Text>
                </Column>
                <Column style={{ textAlign: 'right' }}>
                  <Text style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#dc2626' }}>
                    {fmt(debt.minimumPayment)}
                  </Text>
                </Column>
              </Row>
            ))}
          </Section>
        )}

        <Button
          href={`${BASE}/dashboard`}
          style={{ background: '#2563eb', color: '#ffffff', borderRadius: '10px', padding: '14px 28px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}
        >
          {isSingle ? 'Log My Payment →' : 'Log My Payments →'}
        </Button>
        <Hr style={{ border: 'none', borderTop: '1px solid rgba(15,23,42,0.08)', margin: '28px 0 20px' }} />
        <Text style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
          Logging takes 10 seconds and keeps your payoff plan on track.
        </Text>
      </Section>
    </EmailLayout>
  );
}

DueDateReminderEmail.PreviewProps = {
  debts: [
    { name: 'Caraway Card', minimumPayment: 122 },
    { name: 'Student Loan', minimumPayment: 200 },
  ],
  dueDateLabel: 'May 15',
  daysUntilDue: 3,
  streak: 4,
  unsubscribeUrl: 'https://getsnowballpay.com/unsubscribe',
} satisfies Parameters<typeof DueDateReminderEmail>[0];
