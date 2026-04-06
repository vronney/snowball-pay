import {
  Html, Head, Body, Container, Section,
  Heading, Text, Button, Hr,
} from '@react-email/components';
import * as React from 'react';

interface FirstWinEmailProps {
  userName?: string;
  debtFreeDate: string;
  totalInterestSaved: number;
  debtCount: number;
  monthlyPayment: number;
}

const BASE = 'https://getsnowballpay.com';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function FirstWinEmail({
  userName = 'there',
  debtFreeDate,
  totalInterestSaved,
  debtCount,
  monthlyPayment,
}: FirstWinEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', background: '#ffffff', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(15,23,42,0.08)' }}>

          {/* Header */}
          <Section style={{ background: 'linear-gradient(135deg, #065f46, #059669)', padding: '32px 40px 28px' }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>
              Your plan is live 🎉
            </Text>
            <Heading style={{ color: '#ffffff', fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Debt-free by {debtFreeDate}
            </Heading>
          </Section>

          {/* Key stat */}
          <Section style={{ padding: '32px 40px 0' }}>
            <Section style={{ background: '#f0fdf4', borderRadius: '12px', padding: '20px 24px', border: '1px solid rgba(5,150,105,0.2)', textAlign: 'center' }}>
              <Text style={{ fontSize: '13px', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>
                Interest you&apos;re saving vs. minimums
              </Text>
              <Heading style={{ fontSize: '36px', fontWeight: 900, color: '#065f46', margin: 0, letterSpacing: '-0.04em' }}>
                {fmt(totalInterestSaved)}
              </Heading>
            </Section>
          </Section>

          {/* Body */}
          <Section style={{ padding: '28px 40px 36px' }}>
            <Heading style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
              Great work, {userName}.
            </Heading>
            <Text style={{ fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 24px' }}>
              Your payoff plan across <strong>{debtCount} {debtCount === 1 ? 'debt' : 'debts'}</strong> is set.
              With <strong>{fmt(monthlyPayment)}/month</strong> you&apos;re on track to be completely debt-free
              by <strong>{debtFreeDate}</strong>.
            </Text>

            {/* Next step */}
            <Section style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px 20px', border: '1px solid rgba(15,23,42,0.08)', marginBottom: '28px' }}>
              <Text style={{ fontSize: '13px', fontWeight: 700, color: '#334155', margin: '0 0 4px' }}>
                Your next move
              </Text>
              <Text style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: '1.6' }}>
                Bookmark your dashboard and check in each month after you make a payment.
                Logging your real balance keeps your plan accurate.
              </Text>
            </Section>

            <Button
              href={`${BASE}/dashboard`}
              style={{
                background: '#059669', color: '#ffffff', borderRadius: '10px',
                padding: '14px 28px', fontSize: '15px', fontWeight: 700,
                textDecoration: 'none', display: 'inline-block',
              }}
            >
              View My Dashboard →
            </Button>

            <Hr style={{ border: 'none', borderTop: '1px solid rgba(15,23,42,0.08)', margin: '28px 0 20px' }} />
            <Text style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              Know someone drowning in debt? Share SnowballPay — it&apos;s free for them too.
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
