import { auth0 } from '@/lib/auth0';
import LandingNav from '@/components/landing/LandingNav';
import LandingHero from '@/components/landing/LandingHero';
import SocialProofStrip from '@/components/landing/SocialProofStrip';
import ProblemSolution from '@/components/landing/ProblemSolution';
import FeaturesGrid from '@/components/landing/FeaturesGrid';
import CaseStudies from '@/components/landing/CaseStudies';
import HowItWorks from '@/components/landing/HowItWorks';
import Pricing from '@/components/landing/Pricing';
import Testimonials from '@/components/landing/Testimonials';
import FAQ from '@/components/landing/FAQ';
import FinalCTA from '@/components/landing/FinalCTA';
import LandingFooter from '@/components/landing/LandingFooter';

export default async function Home() {
  const session = await auth0.getSession();
  const isLoggedIn = !!session;

  return (
    <>
      <div className="lp" style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}>
        <LandingNav isLoggedIn={isLoggedIn} />
        <LandingHero isLoggedIn={isLoggedIn} />
        <SocialProofStrip />
        <ProblemSolution />
        <FeaturesGrid />
        <CaseStudies />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <FAQ />
        <FinalCTA isLoggedIn={isLoggedIn} />
        <LandingFooter />
      </div>
    </>
  );
}
