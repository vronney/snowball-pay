import { Section, Heading, Text, Button, Hr } from '@react-email/components';
import * as React from 'react';
import EmailLayout from '@/emails/EmailLayout';

interface WelcomeEmailProps {
  userName?: string;
  /** Present when the account already has a full plan (calculator signups). */
  debtFreeDate?: string;
  interestSaved?: number;
  debtCount?: number;
  /** Partial-setup flags — drive the "one step away" variant. */
  hasDebts?: boolean;
  hasIncome?: boolean;
}

const BASE = 'https://getsnowballpay.com';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function WelcomeEmail({
  userName = 'there',
  debtFreeDate,
  interestSaved,
  debtCount,
  hasDebts = false,
  hasIncome = false,
}: WelcomeEmailProps) {
  const hasPlan = !!debtFreeDate;
  const partial = !hasPlan && (hasDebts || hasIncome);

  return (
    <EmailLayout
      headerGradient="linear-gradient(135deg, #1d4ed8, #2563eb)"
      headerTitle="SnowballPay"
    >
      <Section style={{ padding: '36px 40px' }}>
        <Heading style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          Welcome, {userName} 👋
        </Heading>

        {hasPlan ? (
          <>
            <Text style={{ fontSize: '16px', color: '#475569', lineHeight: '1.7', margin: '0 0 24px' }}>
              Your payoff plan is live
              {debtCount ? (
                <>
                  {' '}across <strong>{debtCount} {debtCount === 1 ? 'debt' : 'debts'}</strong>
                </>
              ) : null}
              . Here&apos;s where it stands:
            </Text>
            <Section style={{ background: '#f0f9ff', borderRadius: '12px', padding: '20px 24px', border: '1px solid rgba(37,99,235,0.15)', marginBottom: '16px', textAlign: 'center' }}>
              <Text style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>
                Debt-free by
              </Text>
              <Heading style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.03em' }}>
                {debtFreeDate}
              </Heading>
              {interestSaved != null && interestSaved > 0 && (
                <Text style={{ fontSize: '14px', color: '#059669', fontWeight: 700, margin: '8px 0 0' }}>
                  {fmt(interestSaved)} in interest reclaimed vs. minimums
                </Text>
              )}
            </Section>
            <Text style={{ fontSize: '14px', color: '#64748b', margin: '0 0 28px', lineHeight: '1.6' }}>
              Log your real balance each month after you pay — that keeps this
              forecast honest and shows every month you shave off.
            </Text>
            <Button href={`${BASE}/dashboard`} style={{ background: '#2563eb', color: '#ffffff', borderRadius: '10px', padding: '14px 28px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
              View My Plan →
            </Button>
          </>
        ) : partial ? (
          <>
            <Text style={{ fontSize: '16px', color: '#475569', lineHeight: '1.7', margin: '0 0 24px' }}>
              You&apos;re one step away from your payoff plan. Here&apos;s what&apos;s left:
            </Text>
            <Section style={{ background: '#f0f9ff', borderRadius: '12px', padding: '20px 24px', border: '1px solid rgba(37,99,235,0.15)', marginBottom: '28px' }}>
              <Text style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>Last step</Text>
              <Text style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                {hasDebts ? 'Add your take-home income' : 'Add your first debt'}
              </Text>
              <Text style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: '1.6' }}>
                {hasDebts
                  ? 'Your income sets the monthly budget — with it, we can compute your exact debt-free date.'
                  : 'Name, balance, interest rate, minimum payment. Takes about 60 seconds.'}
              </Text>
            </Section>
            <Button href={`${BASE}/dashboard`} style={{ background: '#2563eb', color: '#ffffff', borderRadius: '10px', padding: '14px 28px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
              Finish My Plan →
            </Button>
          </>
        ) : (
          <>
            <Text style={{ fontSize: '16px', color: '#475569', lineHeight: '1.7', margin: '0 0 24px' }}>
              You&apos;re one step closer to debt freedom. Here&apos;s your first move:
            </Text>
            <Section style={{ background: '#f0f9ff', borderRadius: '12px', padding: '20px 24px', border: '1px solid rgba(37,99,235,0.15)', marginBottom: '28px' }}>
              <Text style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>Step 1 of 3</Text>
              <Text style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>Add your first debt</Text>
              <Text style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: '1.6' }}>
                Name, balance, interest rate, minimum payment. Takes about 60 seconds.
              </Text>
            </Section>
            <Button href={`${BASE}/dashboard`} style={{ background: '#2563eb', color: '#ffffff', borderRadius: '10px', padding: '14px 28px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
              Add My First Debt →
            </Button>
          </>
        )}

        <Hr style={{ border: 'none', borderTop: '1px solid rgba(15,23,42,0.08)', margin: '32px 0' }} />
        <Text style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.6' }}>
          {hasPlan
            ? 'Your dashboard always has the latest forecast — bookmark it and check in after each payment.'
            : 'Once you’ve added a debt and your take-home income, we’ll generate your full payoff plan with an exact debt-free date.'}
        </Text>
      </Section>
    </EmailLayout>
  );
}

WelcomeEmail.PreviewProps = {
  userName: 'Ronney',
  debtFreeDate: 'March 2028',
  interestSaved: 4820,
  debtCount: 3,
  hasDebts: true,
  hasIncome: true,
} satisfies Parameters<typeof WelcomeEmail>[0];
