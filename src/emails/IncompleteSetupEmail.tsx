import {
  Html, Head, Body, Container, Section,
  Heading, Text, Button, Hr,
} from '@react-email/components';
import * as React from 'react';

interface IncompleteSetupEmailProps {
  userName?: string;
  hasDebts: boolean;
  hasIncome: boolean;
}

const BASE = 'https://getsnowballpay.com';

export default function IncompleteSetupEmail({
  userName = 'there',
  hasDebts,
  hasIncome,
}: IncompleteSetupEmailProps) {
  const missing = !hasDebts ? 'your debts' : 'your income & budget';
  const step    = !hasDebts ? 'Add My Debts' : 'Add My Budget';

  return (
    <Html>
      <Head />
      <Body style={{ background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', background: '#ffffff', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(15,23,42,0.08)' }}>

          {/* Header */}
          <Section style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', padding: '32px 40px 28px' }}>
            <Heading style={{ color: '#ffffff', fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              SnowballPay
            </Heading>
          </Section>

          {/* Progress visual */}
          <Section style={{ padding: '32px 40px 0' }}>
            <Text style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
              Your plan is 80% ready
            </Text>
            <div style={{ background: 'rgba(15,23,42,0.06)', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
              <div style={{ background: '#2563eb', width: '80%', height: '100%', borderRadius: '999px' }} />
            </div>
          </Section>

          {/* Body */}
          <Section style={{ padding: '24px 40px 36px' }}>
            <Heading style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
              Hey {userName}, one step left
            </Heading>
            <Text style={{ fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 24px' }}>
              You still need to add <strong>{missing}</strong> before we can show you your
              exact debt-free date and total interest savings.
            </Text>

            {/* Checklist */}
            <Section style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px 20px', border: '1px solid rgba(15,23,42,0.08)', marginBottom: '28px' }}>
              <Text style={{ fontSize: '14px', margin: '0 0 8px', color: hasDebts ? '#059669' : '#94a3b8' }}>
                {hasDebts ? '✅' : '⬜'} Add your debts
              </Text>
              <Text style={{ fontSize: '14px', margin: 0, color: hasIncome ? '#059669' : '#94a3b8' }}>
                {hasIncome ? '✅' : '⬜'} Add your take-home income
              </Text>
            </Section>

            <Button
              href={`${BASE}/dashboard`}
              style={{
                background: '#2563eb', color: '#ffffff', borderRadius: '10px',
                padding: '14px 28px', fontSize: '15px', fontWeight: 700,
                textDecoration: 'none', display: 'inline-block',
              }}
            >
              {step} →
            </Button>

            <Hr style={{ border: 'none', borderTop: '1px solid rgba(15,23,42,0.08)', margin: '28px 0 20px' }} />
            <Text style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              Most users finish setup in under 3 minutes. Your data is never shared.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={{ background: '#f8fafc', padding: '20px 40px', borderTop: '1px solid rgba(15,23,42,0.07)' }}>
            <Text style={{ fontSize: '12px', color: '#94a3b8', margin: 0, textAlign: 'center' }}>
              © {new Date().getFullYear()} SnowballPay · noreply@getsnowballpay.com
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
