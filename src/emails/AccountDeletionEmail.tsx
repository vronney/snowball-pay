import { Section, Heading, Text, Hr } from '@react-email/components';
import * as React from 'react';
import EmailLayout from '@/emails/EmailLayout';

interface AccountDeletionEmailProps {
  userName?: string;
  subscriptionCanceled?: boolean;
}

export default function AccountDeletionEmail({ userName = 'there', subscriptionCanceled = false }: AccountDeletionEmailProps) {
  return (
    <EmailLayout
      headerGradient="linear-gradient(135deg, #1d4ed8, #2563eb)"
      headerTitle="SnowballPay"
    >
      <Section style={{ padding: '36px 40px' }}>
        <Heading style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          Your account has been deleted
        </Heading>
        <Text style={{ fontSize: '16px', color: '#475569', lineHeight: '1.7', margin: '0 0 24px' }}>
          Hi {userName}, your SnowballPay account and all associated data have been permanently removed.
        </Text>
        <Section style={{ background: '#fef2f2', borderRadius: '12px', padding: '20px 24px', border: '1px solid rgba(239,68,68,0.15)', marginBottom: '24px' }}>
          <Text style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
            What was deleted
          </Text>
          <Text style={{ fontSize: '14px', color: '#475569', margin: 0, lineHeight: '1.8' }}>
            • Debts, income, expenses, and payment history<br />
            • Balance snapshots and payoff plans<br />
            • Uploaded documents and cached recommendations<br />
            • Account preferences and settings<br />
            • Your login account
            {subscriptionCanceled ? <><br />• Your SnowballPay subscription (canceled)</> : null}
          </Text>
        </Section>
        <Text style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.7', margin: '0 0 8px' }}>
          This action is permanent and cannot be undone.
        </Text>
        <Text style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.7', margin: 0 }}>
          If you did not request this deletion or believe this is an error, contact us at{' '}
          <a href="mailto:support@getsnowballpay.com" style={{ color: '#2563eb', textDecoration: 'none' }}>
            support@getsnowballpay.com
          </a>{' '}
          immediately.
        </Text>
        <Hr style={{ border: 'none', borderTop: '1px solid rgba(15,23,42,0.08)', margin: '32px 0' }} />
        <Text style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.6' }}>
          We&apos;re sorry to see you go. If you ever decide to start a new debt payoff journey, we&apos;ll be here.
        </Text>
      </Section>
    </EmailLayout>
  );
}
