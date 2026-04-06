import {
  Html, Head, Body, Container, Section,
  Heading, Text, Button, Hr, Img,
} from '@react-email/components';
import * as React from 'react';

interface SharePromptEmailProps {
  userName?: string;
  debtFreeDate: string;       // e.g. "March 2027"
  interestSaved: number;      // dollars
  monthsRemaining: number;
  totalDebt: number;          // dollars
}

const BASE = 'https://getsnowballpay.com';

function ogUrl(props: Omit<SharePromptEmailProps, 'userName'>) {
  const params = new URLSearchParams({
    date:     props.debtFreeDate,
    interest: String(props.interestSaved),
    months:   String(props.monthsRemaining),
    total:    String(props.totalDebt),
  });
  return `${BASE}/api/og/debt-free?${params.toString()}`;
}

export default function SharePromptEmail({
  userName = 'there',
  debtFreeDate,
  interestSaved,
  monthsRemaining,
  totalDebt,
}: SharePromptEmailProps) {
  const cardImageUrl = ogUrl({ debtFreeDate, interestSaved, monthsRemaining, totalDebt });

  return (
    <Html>
      <Head />
      <Body style={{ background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', background: '#ffffff', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(15,23,42,0.08)' }}>

          {/* Header */}
          <Section style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f172a)', padding: '32px 40px 28px' }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>
              Your milestone
            </Text>
            <Heading style={{ color: '#ffffff', fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Debt-free by {debtFreeDate} 🎯
            </Heading>
          </Section>

          {/* Card image */}
          <Section style={{ padding: '32px 32px 0' }}>
            <Img
              src={cardImageUrl}
              alt={`Debt-free by ${debtFreeDate} — saving $${interestSaved.toLocaleString()} in interest`}
              width="496"
              height="260"
              style={{ borderRadius: '14px', display: 'block', width: '100%' }}
            />
          </Section>

          {/* Body */}
          <Section style={{ padding: '28px 40px 36px' }}>
            <Heading style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
              Share the win, {userName}.
            </Heading>
            <Text style={{ fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 24px' }}>
              You&apos;re on track to save{' '}
              <strong>${interestSaved.toLocaleString()}</strong> in interest and be completely
              debt-free by <strong>{debtFreeDate}</strong>. That&apos;s worth celebrating.
            </Text>
            <Text style={{ fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 28px' }}>
              Open your dashboard to download or copy your shareable card — it takes
              one tap to post on Instagram, LinkedIn, or anywhere you want to mark the moment.
            </Text>

            <Button
              href={`${BASE}/dashboard`}
              style={{
                background: '#2563eb', color: '#ffffff', borderRadius: '10px',
                padding: '14px 28px', fontSize: '15px', fontWeight: 700,
                textDecoration: 'none', display: 'inline-block',
              }}
            >
              Get My Shareable Card →
            </Button>

            <Hr style={{ border: 'none', borderTop: '1px solid rgba(15,23,42,0.08)', margin: '28px 0 20px' }} />
            <Text style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              Know someone who could use a debt-free date? Share SnowballPay — it&apos;s free.
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
