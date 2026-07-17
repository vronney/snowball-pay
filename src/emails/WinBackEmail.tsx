import { Section, Heading, Text, Button, Hr } from '@react-email/components';
import * as React from 'react';
import EmailLayout from '@/emails/EmailLayout';

interface WinBackEmailProps {
  userName?: string;
  dashboardUrl: string;
  unsubscribeUrl: string;
}

export default function WinBackEmail({
  userName = 'there',
  dashboardUrl,
  unsubscribeUrl,
}: WinBackEmailProps) {
  return (
    <EmailLayout
      headerGradient="#0f172a"
      headerTitle="SnowballPay"
      headerSubtitle="A short check-in can restart the habit"
      previewText="Your saved payoff order is ready for a quick review."
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
          Your payoff plan is ready when you are
        </Heading>
        <Text style={{ fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 18px' }}>
          Hi {userName},
        </Text>
        <Text style={{ fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 22px' }}>
          Your saved plan has not recorded an update recently. That can happen when balances,
          income, or priorities change. You do not need to rebuild anything to get moving again.
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
            One useful next step
          </Text>
          <Text style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: 0 }}>
            Open your plan and review the focus debt. Update a balance if it changed, or log the
            latest payment if it did not.
          </Text>
        </Section>
        <Button href={dashboardUrl} style={{
          background: '#2563eb',
          color: '#ffffff',
          borderRadius: '8px',
          padding: '13px 24px',
          fontSize: '14px',
          fontWeight: 700,
          textDecoration: 'none',
          display: 'inline-block',
        }}>
          Review my payoff plan
        </Button>
        <Hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '30px 0 20px' }} />
        <Text style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.6' }}>
          If now is not the right time, your free account remains available. No pressure.
        </Text>
      </Section>
    </EmailLayout>
  );
}

WinBackEmail.PreviewProps = {
  userName: 'Jordan',
  dashboardUrl: 'https://getsnowballpay.com/dashboard?utm_source=lifecycle&utm_medium=email&utm_campaign=win_back&utm_content=supportive_v1',
  unsubscribeUrl: 'https://getsnowballpay.com/api/email/unsubscribe?userId=preview&token=preview',
} satisfies Parameters<typeof WinBackEmail>[0];
