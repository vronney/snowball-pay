import { Section, Heading, Text, Button, Hr } from '@react-email/components';
import * as React from 'react';
import EmailLayout from '@/emails/EmailLayout';

interface CheckoutRecoveryEmailProps {
  userName?: string;
  recoveryUrl: string;
  unsubscribeUrl: string;
}

export default function CheckoutRecoveryEmail({
  userName = 'there',
  recoveryUrl,
  unsubscribeUrl,
}: CheckoutRecoveryEmailProps) {
  return (
    <EmailLayout
      headerGradient="#0f172a"
      headerTitle="SnowballPay"
      headerSubtitle="Pick up right where you left off"
      previewText="Your Pro checkout is saved and ready to finish."
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section style={{ padding: '36px 40px' }}>
        <Heading style={{
          fontSize: '22px',
          fontWeight: 800,
          color: '#0f172a',
          margin: '0 0 12px',
          letterSpacing: '-0.02em',
        }}>
          Finish setting up SnowballPay Pro
        </Heading>
        <Text style={{ fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 18px' }}>
          Hi {userName},
        </Text>
        <Text style={{ fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 22px' }}>
          You started upgrading to Pro but did not finish checkout. Your session is saved —
          the link below reopens it exactly where you left off.
        </Text>
        <Section style={{
          background: '#f8fafc',
          borderRadius: '12px',
          padding: '18px 20px',
          border: '1px solid #e2e8f0',
          marginBottom: '24px',
        }}>
          <Text style={{
            fontSize: '11px',
            fontWeight: 800,
            color: '#475569',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: '0 0 6px',
          }}>
            What Pro adds
          </Text>
          <Text style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: 0 }}>
            Link accounts securely so balances update themselves, and keep your payoff plan
            accurate without manual edits. Cancel anytime — your debts and plan stay either way.
          </Text>
        </Section>
        <Button href={recoveryUrl} style={{
          background: '#2563eb',
          color: '#ffffff',
          borderRadius: '8px',
          padding: '13px 24px',
          fontSize: '14px',
          fontWeight: 700,
          textDecoration: 'none',
          display: 'inline-block',
        }}>
          Finish my upgrade
        </Button>
        <Hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '30px 0 20px' }} />
        <Text style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.6' }}>
          The link works for 30 days. If you have changed your mind, no action is needed —
          your free plan keeps working as-is.
        </Text>
      </Section>
    </EmailLayout>
  );
}

CheckoutRecoveryEmail.PreviewProps = {
  userName: 'Jordan',
  recoveryUrl: 'https://checkout.stripe.com/c/pay/recovery_preview',
  unsubscribeUrl: 'https://getsnowballpay.com/api/email/unsubscribe?userId=preview&token=preview',
} satisfies Parameters<typeof CheckoutRecoveryEmail>[0];
