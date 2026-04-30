import { Section, Heading, Text, Button, Hr } from '@react-email/components';
import * as React from 'react';
import EmailLayout from '@/emails/EmailLayout';

interface WelcomeEmailProps {
  userName?: string;
}

const BASE = 'https://getsnowballpay.com';

export default function WelcomeEmail({ userName = 'there' }: WelcomeEmailProps) {
  return (
    <EmailLayout
      headerGradient="linear-gradient(135deg, #1d4ed8, #2563eb)"
      headerTitle="SnowballPay"
    >
      <Section style={{ padding: '36px 40px' }}>
        <Heading style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          Welcome, {userName} 👋
        </Heading>
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
        <Hr style={{ border: 'none', borderTop: '1px solid rgba(15,23,42,0.08)', margin: '32px 0' }} />
        <Text style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.6' }}>
          Once you&apos;ve added a debt and your take-home income, we&apos;ll generate your full payoff plan with an exact debt-free date.
        </Text>
      </Section>
    </EmailLayout>
  );
}
