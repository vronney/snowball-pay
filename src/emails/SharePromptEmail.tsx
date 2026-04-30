import { Section, Heading, Text, Button, Hr, Img } from '@react-email/components';
import * as React from 'react';
import EmailLayout from '@/emails/EmailLayout';

interface SharePromptEmailProps {
  userName?: string;
  debtFreeDate: string;
  interestSaved: number;
  monthsRemaining: number;
  totalDebt: number;
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

export default function SharePromptEmail({ userName = 'there', debtFreeDate, interestSaved, monthsRemaining, totalDebt }: SharePromptEmailProps) {
  const cardImageUrl = ogUrl({ debtFreeDate, interestSaved, monthsRemaining, totalDebt });

  return (
    <EmailLayout
      headerGradient="linear-gradient(135deg, #1e3a5f, #0f172a)"
      headerLabel="Your milestone"
      headerTitle={`Debt-free by ${debtFreeDate} 🎯`}
    >
      <Section style={{ padding: '32px 32px 0' }}>
        <Img
          src={cardImageUrl}
          alt={`Debt-free by ${debtFreeDate} — saving $${interestSaved.toLocaleString()} in interest`}
          width="496"
          height="260"
          style={{ borderRadius: '14px', display: 'block', width: '100%' }}
        />
      </Section>
      <Section style={{ padding: '28px 40px 36px' }}>
        <Heading style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          Share the win, {userName}.
        </Heading>
        <Text style={{ fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 24px' }}>
          You&apos;re on track to save <strong>${interestSaved.toLocaleString()}</strong> in interest and be completely debt-free by <strong>{debtFreeDate}</strong>. That&apos;s worth celebrating.
        </Text>
        <Text style={{ fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 28px' }}>
          Open your dashboard to download or copy your shareable card — it takes one tap to post on Instagram, LinkedIn, or anywhere you want to mark the moment.
        </Text>
        <Button href={`${BASE}/dashboard`} style={{ background: '#2563eb', color: '#ffffff', borderRadius: '10px', padding: '14px 28px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
          Get My Shareable Card →
        </Button>
        <Hr style={{ border: 'none', borderTop: '1px solid rgba(15,23,42,0.08)', margin: '28px 0 20px' }} />
        <Text style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
          Know someone who could use a debt-free date? Share SnowballPay — it&apos;s free.
        </Text>
      </Section>
    </EmailLayout>
  );
}

SharePromptEmail.PreviewProps = {
  debtFreeDate: 'March 2027',
  interestSaved: 4820,
  monthsRemaining: 22,
  totalDebt: 18450,
} satisfies Parameters<typeof SharePromptEmail>[0];
