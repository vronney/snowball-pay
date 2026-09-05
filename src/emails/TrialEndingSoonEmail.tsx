import { Section, Heading, Text, Button, Hr } from '@react-email/components';
import * as React from 'react';
import EmailLayout from '@/emails/EmailLayout';

interface TrialEndingSoonEmailProps {
  userName?: string;
  /** Whole days left, already computed by the sender. */
  daysLeft: number;
  /** Human date the free Pro window closes, e.g. "September 16". */
  trialEndDate: string;
  debtCount: number;
  /** Projected interest avoided vs minimums-only; omitted when no plan exists. */
  interestAvoided?: number;
  monthlyPrice: number;
  keepProUrl: string;
  unsubscribeUrl: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

const body = { fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 18px' } as const;
const label = {
  fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' as const,
  letterSpacing: '0.08em', margin: '0 0 6px',
};

export default function TrialEndingSoonEmail({
  userName = 'there',
  daysLeft,
  trialEndDate,
  debtCount,
  interestAvoided,
  monthlyPrice,
  keepProUrl,
  unsubscribeUrl,
}: TrialEndingSoonEmailProps) {
  const debts = `${debtCount} ${debtCount === 1 ? 'debt' : 'debts'}`;
  return (
    <EmailLayout
      headerGradient="#0f172a"
      headerTitle="SnowballPay"
      headerSubtitle={`Your free Pro window ends ${trialEndDate}`}
      previewText={`${daysLeft} days of free Pro left. Your plan stays either way.`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section style={{ padding: '36px 40px' }}>
        <Heading style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          {daysLeft} {daysLeft === 1 ? 'day' : 'days'} of free Pro left, {userName}
        </Heading>
        <Text style={body}>
          Every new account gets the full Pro toolkit free for 14 days. Yours ends on{' '}
          <strong>{trialEndDate}</strong>. Here is exactly what that means, so nothing surprises you.
        </Text>

        <Section style={{ background: '#f8fafc', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
          <Text style={label}>What stays on Free</Text>
          <Text style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: 0 }}>
            All {debts}, your payoff order, your debt-free date, and every payment you have logged.
          </Text>
        </Section>
        <Section style={{ background: '#fffbeb', borderRadius: '12px', padding: '18px 20px', border: '1px solid rgba(217,119,6,0.25)', marginBottom: '22px' }}>
          <Text style={{ ...label, color: '#92400e' }}>What pauses on {trialEndDate}</Text>
          <Text style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: 0 }}>
            The coach notes, the what-if scenarios, and adding debts past five.
          </Text>
        </Section>

        {typeof interestAvoided === 'number' && interestAvoided > 0 && (
          <Text style={body}>
            Your plan is currently on track to avoid <strong>{fmt(interestAvoided)}</strong> in interest
            compared with paying minimums only. That number does not change either way. Pro is for the
            months after, when balances move and the next safe move needs to stay obvious.
          </Text>
        )}

        <Button href={keepProUrl} style={{
          background: '#2563eb', color: '#ffffff', borderRadius: '8px', padding: '13px 24px',
          fontSize: '14px', fontWeight: 700, textDecoration: 'none', display: 'inline-block',
        }}>
          Keep Pro, {fmt(monthlyPrice)}/month
        </Button>
        <Text style={{ fontSize: '13px', color: '#64748b', margin: '14px 0 0', lineHeight: '1.6' }}>
          Or do nothing and stay on Free. Nothing is deleted.
        </Text>

        <Hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '30px 0 20px' }} />
        <Text style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.6' }}>
          Reply to this email if something did not work the way you expected. I read every one. — Ron
        </Text>
      </Section>
    </EmailLayout>
  );
}

TrialEndingSoonEmail.PreviewProps = {
  userName: 'Jordan',
  daysLeft: 3,
  trialEndDate: 'September 16',
  debtCount: 10,
  interestAvoided: 2458,
  monthlyPrice: 12,
  keepProUrl: 'https://getsnowballpay.com/dashboard?checkout=pro',
  unsubscribeUrl: 'https://getsnowballpay.com/api/email/unsubscribe?userId=preview&token=preview',
} satisfies TrialEndingSoonEmailProps;
