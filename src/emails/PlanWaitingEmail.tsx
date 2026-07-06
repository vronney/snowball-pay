import { Section, Heading, Text, Button, Hr } from '@react-email/components';
import * as React from 'react';
import EmailLayout from '@/emails/EmailLayout';

interface PlanWaitingEmailProps {
  debtFreeDate?: string;
  interestSaved?: number;
  signupUrl: string;
  unsubscribeUrl: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function PlanWaitingEmail({ debtFreeDate, interestSaved, signupUrl, unsubscribeUrl }: PlanWaitingEmailProps) {
  return (
    <EmailLayout
      headerGradient="linear-gradient(135deg, #1e40af, #2563eb)"
      headerLabel="Your plan is waiting"
      headerTitle={debtFreeDate ? `Debt-free by ${debtFreeDate}` : 'Your payoff plan is ready'}
      unsubscribeUrl={unsubscribeUrl}
    >
      {interestSaved != null && interestSaved > 0 && (
        <Section style={{ padding: '32px 40px 0' }}>
          <Section style={{ background: '#eff6ff', borderRadius: '12px', padding: '20px 24px', border: '1px solid rgba(37,99,235,0.2)', textAlign: 'center' }}>
            <Text style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>
              Interest you could reclaim
            </Text>
            <Heading style={{ fontSize: '36px', fontWeight: 900, color: '#1e40af', margin: 0, letterSpacing: '-0.04em' }}>
              {fmt(interestSaved)}
            </Heading>
          </Section>
        </Section>
      )}
      <Section style={{ padding: '28px 40px 36px' }}>
        <Heading style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          You ran the numbers — here&apos;s where you left off.
        </Heading>
        <Text style={{ fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 24px' }}>
          You built a payoff plan on the SnowballPay calculator
          {debtFreeDate ? (
            <>
              {' '}that has you debt-free by <strong>{debtFreeDate}</strong>
            </>
          ) : null}
          . Create your free account to save it, log payments, and watch the forecast update every month.
        </Text>
        <Button href={signupUrl} style={{ background: '#2563eb', color: '#ffffff', borderRadius: '10px', padding: '14px 28px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
          Pick Up My Plan →
        </Button>
        <Hr style={{ border: 'none', borderTop: '1px solid rgba(15,23,42,0.08)', margin: '28px 0 20px' }} />
        <Text style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
          You gave us this email when you saved a plan on getsnowballpay.com. This is the only reminder we&apos;ll send.
        </Text>
      </Section>
    </EmailLayout>
  );
}

PlanWaitingEmail.PreviewProps = {
  debtFreeDate: 'March 2028',
  interestSaved: 4820,
  signupUrl: 'https://getsnowballpay.com/auth/login?screen_hint=signup',
  unsubscribeUrl: 'https://getsnowballpay.com/api/email/unsubscribe?leadId=x&token=y',
} satisfies Parameters<typeof PlanWaitingEmail>[0];
