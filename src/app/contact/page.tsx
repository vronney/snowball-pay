import type { Metadata } from 'next';
import LandingNav from '@/components/landing/LandingNav';
import LandingFooter from '@/components/landing/LandingFooter';
import SupportContactForm from '@/components/contact/SupportContactForm';
import { auth0 } from '@/lib/auth0';

export const metadata: Metadata = {
  title: 'Contact Support',
  description: 'Contact SnowballPay support without needing a local email client.',
  alternates: {
    canonical: 'https://getsnowballpay.com/contact',
  },
};

export default async function ContactPage() {
  const session = await auth0.getSession();
  const isLoggedIn = !!session;

  return (
    <div className="lp" style={{ backgroundColor: '#f8fafc', color: '#0f172a', minHeight: '100vh' }}>
      <LandingNav isLoggedIn={isLoggedIn} />
      <div style={{ paddingTop: '120px' }}>
        <SupportContactForm />
      </div>
      <LandingFooter />
    </div>
  );
}
