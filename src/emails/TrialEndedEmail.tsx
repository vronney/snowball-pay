import { Section, Heading, Text, Button, Hr } from '@react-email/components';
import * as React from 'react';
import EmailLayout from '@/emails/EmailLayout';

interface TrialEndedEmailProps {
  userName?: string;
  /** "today" on the boundary's own day, otherwise "on September 5". */
  endedOn: string;
  debtCount: number;
  monthlyPrice: number;
  keepProUrl: string;
  unsubscribeUrl: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

const body = { fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 18px' } as const;

export default function TrialEndedEmail({
  userName = 'there',
  endedOn,
  debtCount,
  monthlyPrice,
  keepProUrl,
  unsubscribeUrl,
}: TrialEndedEmailProps) {
  const debts = `${debtCount} ${debtCount === 1 ? 'debt' : 'debts'}`;
  return (
    <EmailLayout
      headerGradient="#0f172a"
      headerTitle="SnowballPay"
      headerSubtitle="Your free Pro window has ended"
      previewText="Your plan and every logged payment are still here on Free."
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section style={{ padding: '36px 40px' }}>
        <Heading style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          Your free Pro ended {endedOn}. Your plan did not.
        </Heading>
        <Text style={body}>
          Your 14 days of Pro are done, {userName}. Your {debts}, your payoff order, and your
          debt-free date are all still here on Free, along with every payment you logged.
        </Text>
        <Section style={{ background: '#f8fafc', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0', marginBottom: '22px' }}>
          <Text style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
            What paused {endedOn}
          </Text>
          <Text style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: 0 }}>
            Coach notes, what-if scenarios, and adding debts past five.
          </Text>
        </Section>
        <Text style={body}>
          If those helped, you can turn them back on in one click.
        </Text>
        <Button href={keepProUrl} style={{
          background: '#2563eb', color: '#ffffff', borderRadius: '8px', padding: '13px 24px',
          fontSize: '14px', fontWeight: 700, textDecoration: 'none', display: 'inline-block',
        }}>
          Keep Pro, {fmt(monthlyPrice)}/month
        </Button>
        <Hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '30px 0 20px' }} />
        <Text style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.6' }}>
          If they did not help, tell me why by replying to this email. I read every one. — Ron
        </Text>
      </Section>
    </EmailLayout>
  );
}

TrialEndedEmail.PreviewProps = {
  userName: 'Jordan',
  endedOn: 'today',
  debtCount: 7,
  monthlyPrice: 12,
  keepProUrl: 'https://getsnowballpay.com/dashboard?checkout=pro',
  unsubscribeUrl: 'https://getsnowballpay.com/api/email/unsubscribe?userId=preview&token=preview',
} satisfies TrialEndedEmailProps;
