import { Section, Heading, Text, Hr } from '@react-email/components';
import * as React from 'react';
import EmailLayout from '@/emails/EmailLayout';

/**
 * Third and last trial email, a few days after the free window closed, to
 * accounts that have not touched their plan since. No button, no price: the
 * only ask is a reply, so the sender must route replies to a read mailbox.
 */
interface TrialStoppedEmailProps {
  userName?: string;
  /** Payments the account logged while it was in use; 0 hides the count. */
  paymentsLogged: number;
  unsubscribeUrl: string;
}

const REASONS = [
  'I went back to a spreadsheet or the notes app',
  'Setting up my debts took too long',
  'I could not tell what it was doing for me',
  'Money is tight and $12 is not happening right now',
  'Something else (tell me, blunt is fine)',
];

const body = { fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 18px' } as const;

export default function TrialStoppedEmail({
  userName = 'there',
  paymentsLogged,
  unsubscribeUrl,
}: TrialStoppedEmailProps) {
  const stillHere =
    paymentsLogged > 0
      ? `Your account is still there if you come back, along with the ${paymentsLogged} ${paymentsLogged === 1 ? 'payment' : 'payments'} you logged.`
      : 'Your account and your plan are still there if you come back.';

  return (
    <EmailLayout
      headerGradient="#0f172a"
      headerTitle="SnowballPay"
      headerSubtitle="Not a pitch. A question."
      previewText="Not a pitch. A question."
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section style={{ padding: '36px 40px' }}>
        <Heading style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          What made you stop, {userName}?
        </Heading>
        <Text style={body}>
          You tried SnowballPay for two weeks and then stopped. I would rather understand why than
          send you another upgrade email.
        </Text>
        <Text style={{ ...body, margin: '0 0 8px' }}>
          If you have thirty seconds, just reply with whichever one is closest:
        </Text>
        <Section style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 20px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
          {REASONS.map((reason, index) => (
            <Text key={reason} style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '4px 0' }}>
              <strong style={{ color: '#0f172a' }}>{index + 1}.</strong> {reason}
            </Text>
          ))}
        </Section>
        <Text style={body}>
          Answer 4 is a completely legitimate answer and I would genuinely like to know if that is
          the one. I am not going to pitch you.
        </Text>
        <Text style={body}>{stillHere}</Text>

        <Hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '30px 0 20px' }} />
        <Text style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.6' }}>
          Replies come straight to me. I read every one. — Ron, building SnowballPay
        </Text>
      </Section>
    </EmailLayout>
  );
}

TrialStoppedEmail.PreviewProps = {
  userName: 'Jordan',
  paymentsLogged: 4,
  unsubscribeUrl: 'https://getsnowballpay.com/api/email/unsubscribe?userId=preview&token=preview',
} satisfies TrialStoppedEmailProps;
