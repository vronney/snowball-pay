import { auth0 } from '@/lib/auth0';
import LandingStyles from '@/components/landing/LandingStyles';
import LandingNav from '@/components/landing/LandingNav';
import LandingHero from '@/components/landing/LandingHero';
import SocialProofStrip from '@/components/landing/SocialProofStrip';
import FeaturesGrid from '@/components/landing/FeaturesGrid';
import HowItWorks from '@/components/landing/HowItWorks';
import Testimonials from '@/components/landing/Testimonials';
import FinalCTA from '@/components/landing/FinalCTA';
import LandingFooter from '@/components/landing/LandingFooter';

export default async function Home() {
  const session = await auth0.getSession();
  const isLoggedIn = !!session;

  return (
    <>
      <LandingStyles />
      <div style={{ backgroundColor: '#0f1729', color: '#e2e8f0', fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <LandingNav isLoggedIn={isLoggedIn} />
        <LandingHero isLoggedIn={isLoggedIn} />
        <SocialProofStrip />
        <FeaturesGrid />
        <HowItWorks />
        <Testimonials />
        <FinalCTA isLoggedIn={isLoggedIn} />
        <LandingFooter />
      </div>
    </>
  );
}
