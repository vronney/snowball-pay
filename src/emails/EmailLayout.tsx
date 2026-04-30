import { Html, Head, Body, Container, Section, Heading, Text, Button, Hr } from '@react-email/components';
import * as React from 'react';

interface EmailLayoutProps {
  headerGradient: string;
  headerLabel?: string;
  headerTitle: string;
  headerSubtitle?: string;
  unsubscribeUrl?: string;
  children: React.ReactNode;
}

function EmailLayout({
  headerGradient, headerLabel, headerTitle, headerSubtitle, unsubscribeUrl, children,
}: EmailLayoutProps) {
  return (
    <Html>
      <Head>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');`}</style>
      </Head>
      <Body style={{ background: '#f8fafc', fontFamily: "'DM Sans', system-ui, sans-serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', background: '#ffffff', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(15,23,42,0.08)' }}>
          <Section style={{ background: headerGradient, padding: '32px 40px 28px' }}>
            {headerLabel ? (
              <>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>
                  {headerLabel}
                </Text>
                <Heading style={{ color: '#ffffff', fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                  {headerTitle}
                </Heading>
              </>
            ) : (
              <>
                <Heading style={{ color: '#ffffff', fontSize: '22px', fontWeight: 800, margin: headerSubtitle ? '0 0 4px' : 0, letterSpacing: '-0.02em' }}>
                  {headerTitle}
                </Heading>
                {headerSubtitle && (
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', margin: 0 }}>
                    {headerSubtitle}
                  </Text>
                )}
              </>
            )}
          </Section>
          {children}
          <Section style={{ background: '#f8fafc', padding: '20px 40px', borderTop: '1px solid rgba(15,23,42,0.07)' }}>
            <Text style={{ fontSize: '12px', color: '#94a3b8', margin: 0, textAlign: 'center' }}>
              © {new Date().getFullYear()} SnowballPay · noreply@getsnowballpay.com
            </Text>
            {unsubscribeUrl && (
              <Text style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0', textAlign: 'center' }}>
                <a href={unsubscribeUrl} style={{ color: '#64748b' }}>Unsubscribe</a>
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default EmailLayout;

EmailLayout.PreviewProps = {
  headerGradient: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
  headerTitle: 'SnowballPay',
  headerSubtitle: 'Shared email layout',
  unsubscribeUrl: 'https://getsnowballpay.com/unsubscribe',
  children: React.createElement(
    Section,
    { style: { padding: '36px 40px' } },
    React.createElement(Heading, { style: { fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', letterSpacing: '-0.02em' } }, 'Layout preview'),
    React.createElement(Text, { style: { fontSize: '15px', color: '#475569', lineHeight: '1.7', margin: '0 0 24px' } }, 'This is the shared wrapper used by every SnowballPay email. Individual templates slot their content here.'),
    React.createElement(Button, { href: 'https://getsnowballpay.com/dashboard', style: { background: '#2563eb', color: '#ffffff', borderRadius: '10px', padding: '14px 28px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' } }, 'Example CTA →'),
    React.createElement(Hr, { style: { border: 'none', borderTop: '1px solid rgba(15,23,42,0.08)', margin: '28px 0 20px' } }),
    React.createElement(Text, { style: { fontSize: '13px', color: '#94a3b8', margin: 0 } }, 'Footer note goes here.'),
  ),
} satisfies Parameters<typeof EmailLayout>[0];
