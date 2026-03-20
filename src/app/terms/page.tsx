import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Terms of Service — SnowballPay',
  description: 'Terms governing your use of SnowballPay, the personal debt payoff planner.',
};

export default function TermsOfServicePage() {
  return (
    <div style={{ backgroundColor: '#0d1424', color: '#e1e8f0', minHeight: '100vh' }}>
      {/* Nav */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/">
            <Image src="/logo.svg" alt="SnowballPay" width={130} height={25} />
          </a>
          <a href="/privacy" style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none' }}>
            ← Privacy Policy
          </a>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '56px 24px 80px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', color: '#f1f5f9' }}>
          Terms of Service
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '40px' }}>
          Effective date: March 20, 2026 &nbsp;·&nbsp; Last updated: March 20, 2026
        </p>

        <LegalSection>
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) are a legally binding agreement between you and SnowballPay
            (&ldquo;SnowballPay,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) governing your access to and use of the
            website and web application at <strong>getsnowballpay.com</strong> (collectively, the
            &ldquo;Service&rdquo;).
          </p>
          <p>
            <strong>By creating an account or using the Service, you agree to be bound by these Terms.
            If you do not agree, do not use the Service.</strong>
          </p>
          <p>
            Please also read our{' '}
            <a href="/privacy" style={{ color: '#60a5fa' }}>Privacy Policy</a>, which is
            incorporated into these Terms by reference.
          </p>
        </LegalSection>

        {/* ─── 1. Description of Service ────────────────────────────────── */}
        <SectionHeading number="1" title="Description of the Service" />
        <LegalSection>
          <p>
            SnowballPay is a personal debt management and payoff planning tool. The Service allows you to:
          </p>
          <ul>
            <li>Enter and track debts, income, and expenses</li>
            <li>Generate a debt payoff plan using the Debt Snowball method</li>
            <li>Upload financial documents (bank statements, pay stubs) for automated data extraction</li>
            <li>Receive AI-generated personalized suggestions for paying off debt faster</li>
            <li>Track your actual balance progress against your plan over time</li>
          </ul>
          <p>
            The Service is intended for <strong>personal, non-commercial use</strong> by individuals
            managing their own finances.
          </p>
        </LegalSection>

        {/* ─── 2. Not Financial Advice — Critical Disclaimer ────────────── */}
        <SectionHeading number="2" title="Not Financial Advice — Important Disclaimer" />
        <LegalSection>
          <Callout>
            <strong>SnowballPay is a planning and organizational tool, not a financial advisory service.</strong>
            <br /><br />
            Everything provided by SnowballPay — including debt payoff projections, AI-generated
            recommendations, interest calculations, suggested payment strategies, and any other output
            of the Service — is for <strong>informational and educational purposes only</strong>. It does
            not constitute and should not be treated as financial advice, investment advice, tax advice,
            legal advice, or any other form of regulated professional advice.
          </Callout>
          <p>
            Specifically, you acknowledge and agree that:
          </p>
          <ul>
            <li>
              <strong>We are not a regulated financial entity.</strong> SnowballPay is not a bank, credit
              union, financial institution, mortgage lender, broker-dealer, investment adviser registered
              with the SEC or any state, credit counseling agency, or debt management company. We are not
              regulated by the CFPB, FINRA, the SEC, or any equivalent regulatory body.
            </li>
            <li>
              <strong>Projections are estimates, not guarantees.</strong> Debt payoff timelines, interest
              savings estimates, and debt-free dates are mathematical projections based on the data you
              enter. They assume consistent payments and static interest rates. Actual outcomes will vary
              based on your payment behavior, interest rate changes, additional charges, and other
              factors outside our control.
            </li>
            <li>
              <strong>AI recommendations are suggestions only.</strong> Recommendations generated by our
              AI are based on patterns in the data you provide. They are not tailored professional advice
              and may not account for your complete financial picture, tax situation, legal circumstances,
              or personal goals. You should not make significant financial decisions based solely on
              AI-generated output.
            </li>
            <li>
              <strong>Consult a professional for important decisions.</strong> Before making major
              financial decisions — including refinancing debt, consolidating loans, or making significant
              changes to your financial situation — we strongly encourage you to consult a qualified
              financial advisor, credit counselor, accountant, or attorney.
            </li>
            <li>
              <strong>We do not verify your data.</strong> We present calculations based on the
              information you enter. We do not verify the accuracy of your inputs or your creditworthiness.
            </li>
          </ul>
        </LegalSection>

        {/* ─── 3. Eligibility ───────────────────────────────────────────── */}
        <SectionHeading number="3" title="Eligibility" />
        <LegalSection>
          <p>To use the Service, you must:</p>
          <ul>
            <li>Be at least <strong>18 years of age</strong> (or the age of legal majority in your jurisdiction)</li>
            <li>Have the legal capacity to enter into a binding agreement</li>
            <li>Not be prohibited from using the Service under applicable law</li>
          </ul>
          <p>
            By using the Service, you represent and warrant that you meet all of the above requirements.
          </p>
        </LegalSection>

        {/* ─── 4. Account Registration and Security ─────────────────────── */}
        <SectionHeading number="4" title="Account Registration and Security" />
        <LegalSection>
          <p>
            You must create an account to use the Service. Accounts are created through Google login
            via Auth0. By registering, you agree to:
          </p>
          <ul>
            <li>Provide accurate and truthful information</li>
            <li>Keep your login credentials (Google account and any session tokens) secure and
              confidential</li>
            <li>Notify us immediately at{' '}
              <a href="mailto:support@getsnowballpay.com" style={{ color: '#60a5fa' }}>
                support@getsnowballpay.com
              </a> if you believe your account has been compromised</li>
            <li>Accept responsibility for all activity that occurs under your account</li>
          </ul>
          <p>
            You may only create one account per person. Creating accounts on behalf of others, or
            sharing account access, is not permitted.
          </p>
        </LegalSection>

        {/* ─── 5. Acceptable Use ────────────────────────────────────────── */}
        <SectionHeading number="5" title="Acceptable Use Policy" />
        <LegalSection>
          <p>
            You agree to use the Service only for lawful purposes and in accordance with these Terms.
            You <strong>must not</strong>:
          </p>
          <ul>
            <li>Use the Service for any purpose other than personal financial planning</li>
            <li>Upload documents that do not belong to you or for which you do not have the right to share</li>
            <li>Upload files containing malicious code, malware, or content designed to interfere with
              the Service or its infrastructure</li>
            <li>Attempt to gain unauthorized access to any other user&apos;s account or data</li>
            <li>Attempt to reverse engineer, decompile, scrape, or extract source code or data from
              the Service</li>
            <li>Probe, scan, or test the vulnerability of the Service without our prior written consent</li>
            <li>Interfere with or disrupt the integrity or performance of the Service or its infrastructure</li>
            <li>Use automated bots, scripts, or tools to access the Service in ways not intended by
              its design</li>
            <li>Violate any applicable local, state, national, or international law or regulation</li>
            <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity</li>
          </ul>
          <p>
            We reserve the right to investigate potential violations and to suspend or terminate accounts
            that engage in prohibited conduct, without prior notice.
          </p>
        </LegalSection>

        {/* ─── 6. User Content and Data ─────────────────────────────────── */}
        <SectionHeading number="6" title="Your Content and Data" />
        <LegalSection>
          <SubHeading>6.1 Ownership</SubHeading>
          <p>
            You retain all ownership rights to the financial data and documents you enter or upload to
            the Service (&ldquo;Your Content&rdquo;). We do not claim any ownership over your financial information.
          </p>

          <SubHeading>6.2 License to Us</SubHeading>
          <p>
            By entering or uploading content to the Service, you grant us a limited, non-exclusive,
            royalty-free license to process, store, and use Your Content solely for the purpose of
            providing the Service to you. This license terminates when you delete your content or
            your account, subject to backup retention periods described in our Privacy Policy.
          </p>

          <SubHeading>6.3 Your Responsibility for Your Data</SubHeading>
          <p>
            You are solely responsible for the accuracy of the data you enter and the documents you
            upload. Ensure you have the right to share any documents you upload. Do not upload documents
            containing other people&apos;s personal information without their consent.
          </p>

          <SubHeading>6.4 Sensitive Document Guidance</SubHeading>
          <p>
            When uploading financial documents for AI-powered extraction, those files are transmitted
            to our AI provider (Anthropic). Please review the Privacy Policy for how this data is
            handled. We recommend redacting or obscuring full account numbers, Social Security Numbers,
            and other highly sensitive data that is not necessary for debt payoff planning before uploading.
          </p>
        </LegalSection>

        {/* ─── 7. AI-Generated Content ──────────────────────────────────── */}
        <SectionHeading number="7" title="AI-Generated Content" />
        <LegalSection>
          <p>
            SnowballPay uses artificial intelligence — specifically, the Anthropic Claude API — to:
          </p>
          <ul>
            <li>Extract financial data from documents you upload</li>
            <li>Generate personalized debt payoff recommendations</li>
          </ul>
          <p>
            You acknowledge and agree to the following regarding AI-generated content:
          </p>
          <ul>
            <li>
              <strong>Potential for errors:</strong> AI models can make mistakes. Extracted data from
              uploaded documents may be incomplete, inaccurate, or misclassified. Always review
              extracted data for accuracy before using it in your plan.
            </li>
            <li>
              <strong>Not personalized professional advice:</strong> AI recommendations are generated
              based on patterns and general principles. They do not account for your complete financial
              situation, risk tolerance, or personal circumstances. They are suggestions to consider,
              not directives to follow.
            </li>
            <li>
              <strong>No guarantee of outcomes:</strong> Following AI-generated suggestions does not
              guarantee any particular financial outcome. Results depend entirely on your individual
              circumstances and actions.
            </li>
            <li>
              <strong>AI output may be cached:</strong> Recommendations are cached and reused until
              your underlying financial data changes significantly. Cached recommendations may not
              reflect very recent changes to your situation.
            </li>
            <li>
              <strong>Third-party AI provider:</strong> AI features are powered by Anthropic&apos;s
              Claude models. Availability of AI features depends on Anthropic&apos;s service availability.
              SnowballPay is not responsible for Anthropic outages or API changes.
            </li>
          </ul>
        </LegalSection>

        {/* ─── 8. Intellectual Property ─────────────────────────────────── */}
        <SectionHeading number="8" title="Intellectual Property" />
        <LegalSection>
          <p>
            The Service, including its design, user interface, algorithms, code, logos, and all content
            we create (excluding Your Content), is owned by SnowballPay and protected by copyright,
            trademark, and other intellectual property laws.
          </p>
          <p>
            We grant you a limited, non-exclusive, non-transferable, revocable license to use the
            Service for your personal, non-commercial use. This license does not include the right to:
          </p>
          <ul>
            <li>Copy, reproduce, or distribute any part of the Service</li>
            <li>Create derivative works based on the Service</li>
            <li>Use our trademarks, logos, or brand elements without prior written permission</li>
          </ul>
        </LegalSection>

        {/* ─── 9. Third-Party Services ──────────────────────────────────── */}
        <SectionHeading number="9" title="Third-Party Services" />
        <LegalSection>
          <p>
            The Service relies on third-party services including Auth0, Neon, Vercel, and Anthropic.
            Your use of the Service is also subject to the terms and policies of these providers.
            We are not responsible for the actions, privacy practices, or service availability of
            these third parties.
          </p>
          <p>
            Links within the Service to external websites are provided for convenience only. We do not
            endorse and are not responsible for any external websites or their content.
          </p>
        </LegalSection>

        {/* ─── 10. Payment and Pricing ──────────────────────────────────── */}
        <SectionHeading number="10" title="Pricing and Payment" />
        <LegalSection>
          <p>
            SnowballPay is currently provided free of charge. We reserve the right to introduce
            paid plans, features, or subscriptions in the future. If we do:
          </p>
          <ul>
            <li>We will provide at least <strong>30 days&apos; advance notice</strong> of any pricing changes
              that affect your current access</li>
            <li>Any free features that existed at the time you created your account will be described
              in a clear transition policy</li>
            <li>All pricing and payment terms applicable to paid plans will be presented clearly
              before any purchase is required</li>
          </ul>
        </LegalSection>

        {/* ─── 11. Termination ──────────────────────────────────────────── */}
        <SectionHeading number="11" title="Termination" />
        <LegalSection>
          <SubHeading>11.1 Termination by You</SubHeading>
          <p>
            You may stop using the Service at any time. To permanently delete your account and all
            associated data, contact us at{' '}
            <a href="mailto:support@getsnowballpay.com" style={{ color: '#60a5fa' }}>
              support@getsnowballpay.com
            </a>. We will process account deletion requests within 30 days.
          </p>

          <SubHeading>11.2 Termination by Us</SubHeading>
          <p>
            We reserve the right to suspend or terminate your account at any time, with or without notice,
            if we reasonably believe:
          </p>
          <ul>
            <li>You have violated these Terms or our Acceptable Use Policy</li>
            <li>Your use poses a security risk to the Service or other users</li>
            <li>We are required to do so by law or legal process</li>
          </ul>
          <p>
            Where feasible and permitted by law, we will provide you with notice and an opportunity
            to remedy a violation before termination. Terminations for serious violations (fraud,
            security attacks) may occur without prior notice.
          </p>

          <SubHeading>11.3 Effect of Termination</SubHeading>
          <p>
            Upon termination of your account:
          </p>
          <ul>
            <li>Your access to the Service will immediately cease</li>
            <li>Your data will be deleted in accordance with our Privacy Policy&apos;s data retention
              schedule (within 30 days from production databases)</li>
            <li>Sections of these Terms that by their nature should survive termination will continue
              to apply, including Sections 2 (No Financial Advice), 8 (Intellectual Property),
              12 (Disclaimers), 13 (Limitation of Liability), and 15 (Governing Law)</li>
          </ul>
        </LegalSection>

        {/* ─── 12. Disclaimers ──────────────────────────────────────────── */}
        <SectionHeading number="12" title="Disclaimers of Warranties" />
        <LegalSection>
          <Callout warning>
            THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE,&rdquo; WITHOUT WARRANTY OF ANY KIND,
            EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SNOWBALLPAY
            EXPRESSLY DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:
            <br /><br />
            (A) WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT;<br />
            (B) THAT THE SERVICE WILL MEET YOUR REQUIREMENTS OR BE AVAILABLE ON AN UNINTERRUPTED,
            TIMELY, SECURE, OR ERROR-FREE BASIS;<br />
            (C) THAT AI-GENERATED RECOMMENDATIONS OR DOCUMENT EXTRACTIONS WILL BE ACCURATE, COMPLETE,
            OR SUITABLE FOR YOUR PURPOSES;<br />
            (D) THAT DEBT PROJECTIONS OR PAYOFF TIMELINES WILL ACCURATELY PREDICT YOUR ACTUAL OUTCOMES;<br />
            (E) THAT ANY ERRORS IN THE SERVICE WILL BE CORRECTED.
          </Callout>
          <p>
            Some jurisdictions do not allow the exclusion of implied warranties, so some of the above
            exclusions may not apply to you.
          </p>
        </LegalSection>

        {/* ─── 13. Limitation of Liability ──────────────────────────────── */}
        <SectionHeading number="13" title="Limitation of Liability" />
        <LegalSection>
          <Callout warning>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SNOWBALLPAY AND ITS OFFICERS,
            EMPLOYEES, AGENTS, PARTNERS, AND LICENSORS SHALL NOT BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING BUT
            NOT LIMITED TO:
            <br /><br />
            — LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES;<br />
            — FINANCIAL LOSSES ARISING FROM RELIANCE ON AI RECOMMENDATIONS OR DEBT PROJECTIONS;<br />
            — COSTS OF SUBSTITUTE GOODS OR SERVICES;<br />
            — DAMAGES RESULTING FROM UNAUTHORIZED ACCESS TO OR ALTERATION OF YOUR DATA;<br />
            — INTERRUPTION OR CESSATION OF THE SERVICE.
            <br /><br />
            THIS APPLIES WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE),
            STRICT LIABILITY, OR ANY OTHER LEGAL THEORY, AND EVEN IF SNOWBALLPAY HAS BEEN
            ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </Callout>
          <p>
            <strong>Aggregate Liability Cap:</strong> In no event will our total aggregate liability
            to you for all claims arising out of or relating to the Service exceed the greater of:
            (a) the amount you paid us in the 12 months preceding the claim, or (b) <strong>$50 USD</strong>.
          </p>
          <p>
            Some jurisdictions do not allow limitations on liability for certain types of damages, so
            some of these limitations may not apply to you. In such jurisdictions, our liability is
            limited to the maximum extent permitted by law.
          </p>
        </LegalSection>

        {/* ─── 14. Indemnification ──────────────────────────────────────── */}
        <SectionHeading number="14" title="Indemnification" />
        <LegalSection>
          <p>
            You agree to defend, indemnify, and hold harmless SnowballPay and its officers, employees,
            agents, and partners from and against any claims, liabilities, damages, judgments, awards,
            losses, costs, expenses, and legal fees arising out of or relating to:
          </p>
          <ul>
            <li>Your violation of these Terms</li>
            <li>Your use of the Service in a manner not authorized by these Terms</li>
            <li>Any content you upload or submit to the Service</li>
            <li>Your violation of any third party&apos;s rights, including privacy rights</li>
            <li>Your violation of any applicable law or regulation</li>
          </ul>
        </LegalSection>

        {/* ─── 15. Governing Law and Dispute Resolution ─────────────────── */}
        <SectionHeading number="15" title="Governing Law and Dispute Resolution" />
        <LegalSection>
          <SubHeading>15.1 Governing Law</SubHeading>
          <p>
            These Terms are governed by and construed in accordance with the laws of the
            <strong> State of [Your State], United States</strong>, without regard to its conflict
            of law provisions. If you are a consumer resident in the European Union, you may also
            benefit from any mandatory protections provided by the laws of your country of residence
            that cannot be derogated from by agreement.
          </p>

          <SubHeading>15.2 Informal Resolution</SubHeading>
          <p>
            Before initiating formal legal proceedings, we both agree to attempt to resolve disputes
            informally. Contact us at{' '}
            <a href="mailto:support@getsnowballpay.com" style={{ color: '#60a5fa' }}>
              support@getsnowballpay.com
            </a>{' '}
            with a description of your dispute. We will work in good faith to resolve the issue within
            30 days.
          </p>

          <SubHeading>15.3 Disputes</SubHeading>
          <p>
            If informal resolution fails, any dispute arising out of or relating to these Terms or
            the Service shall be subject to the exclusive jurisdiction of the courts located in
            <strong> [Your State]</strong>, and you consent to personal jurisdiction in such courts.
          </p>
          <p>
            <strong>Exception for EU/EEA Users:</strong> If you are a consumer resident in the EU or EEA,
            you may also submit a dispute through the European Commission&apos;s Online Dispute Resolution
            platform at{' '}
            <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer"
               style={{ color: '#60a5fa' }}>
              ec.europa.eu/consumers/odr
            </a>.
          </p>

          <SubHeading>15.4 Class Action Waiver</SubHeading>
          <p>
            To the extent permitted by applicable law, you agree to resolve disputes with SnowballPay
            on an individual basis only, and not as a plaintiff or class member in any purported class,
            collective, or representative action. This waiver does not apply to users in jurisdictions
            where class action waivers are prohibited.
          </p>
        </LegalSection>

        {/* ─── 16. Changes to Terms ─────────────────────────────────────── */}
        <SectionHeading number="16" title="Changes to These Terms" />
        <LegalSection>
          <p>
            We may modify these Terms at any time. When we make material changes, we will:
          </p>
          <ul>
            <li>Update the &ldquo;Last updated&rdquo; date at the top of this page</li>
            <li>Notify you by email at least <strong>14 days</strong> before changes take effect
              (or 30 days for changes that materially affect your rights)</li>
            <li>Where required by law, obtain your consent before the changes apply to you</li>
          </ul>
          <p>
            Continued use of the Service after the effective date of any changes constitutes your
            acceptance of the updated Terms. If you disagree with any changes, you should stop using
            the Service and delete your account.
          </p>
        </LegalSection>

        {/* ─── 17. Miscellaneous ────────────────────────────────────────── */}
        <SectionHeading number="17" title="Miscellaneous" />
        <LegalSection>
          <SubHeading>17.1 Entire Agreement</SubHeading>
          <p>
            These Terms, together with our Privacy Policy and any other policies incorporated by
            reference, constitute the entire agreement between you and SnowballPay regarding your
            use of the Service and supersede all prior agreements.
          </p>

          <SubHeading>17.2 Severability</SubHeading>
          <p>
            If any provision of these Terms is found to be invalid, illegal, or unenforceable, that
            provision will be limited or eliminated to the minimum extent necessary, and the remaining
            provisions will continue in full force and effect.
          </p>

          <SubHeading>17.3 No Waiver</SubHeading>
          <p>
            Our failure to enforce any right or provision of these Terms will not constitute a waiver
            of that right or provision. A waiver will only be effective if made in writing and signed
            by an authorized representative of SnowballPay.
          </p>

          <SubHeading>17.4 Assignment</SubHeading>
          <p>
            You may not assign or transfer your rights or obligations under these Terms without our
            prior written consent. We may assign our rights and obligations under these Terms at any
            time without notice, including in connection with a merger, acquisition, or sale of assets.
            These Terms will be binding on any assignee.
          </p>

          <SubHeading>17.5 Force Majeure</SubHeading>
          <p>
            We will not be liable for any delay or failure to perform resulting from causes outside
            our reasonable control, including but not limited to acts of God, natural disasters,
            pandemic, war, terrorism, internet or infrastructure outages, or third-party service
            provider failures (including Auth0, Neon, Vercel, or Anthropic outages).
          </p>

          <SubHeading>17.6 Contact Information</SubHeading>
          <p>
            For questions about these Terms, contact us:
          </p>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '20px', marginTop: '12px' }}>
            <p style={{ margin: 0, lineHeight: '2' }}>
              <strong>SnowballPay</strong><br />
              General:{' '}
              <a href="mailto:support@getsnowballpay.com" style={{ color: '#60a5fa' }}>
                support@getsnowballpay.com
              </a><br />
              Privacy:{' '}
              <a href="mailto:privacy@getsnowballpay.com" style={{ color: '#60a5fa' }}>
                privacy@getsnowballpay.com
              </a><br />
              Website:{' '}
              <a href="https://getsnowballpay.com" style={{ color: '#60a5fa' }}>
                getsnowballpay.com
              </a>
            </p>
          </div>
        </LegalSection>

        {/* Footer nav */}
        <div style={{ marginTop: '64px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/" style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none' }}>
            ← Back to SnowballPay
          </a>
          <a href="/privacy" style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none' }}>
            Privacy Policy →
          </a>
        </div>
      </main>
    </div>
  );
}

/* ─── Shared layout sub-components ──────────────────────────────────────────── */

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <h2 style={{
      fontSize: '20px',
      fontWeight: 600,
      color: '#f1f5f9',
      marginTop: '40px',
      marginBottom: '12px',
      paddingBottom: '8px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      {number}. {title}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#cbd5e1', marginTop: '20px', marginBottom: '8px' }}>
      {children}
    </h3>
  );
}

function LegalSection({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '15px',
      lineHeight: '1.75',
      color: '#94a3b8',
    }}>
      <style>{`
        .legal-section p { margin-bottom: 12px; }
        .legal-section ul { padding-left: 20px; margin-bottom: 12px; }
        .legal-section li { margin-bottom: 6px; }
      `}</style>
      <div className="legal-section">
        {children}
      </div>
    </div>
  );
}

function Callout({ children, warning }: { children: React.ReactNode; warning?: boolean }) {
  return (
    <div style={{
      backgroundColor: warning ? 'rgba(239, 68, 68, 0.08)' : 'rgba(96, 165, 250, 0.08)',
      border: `1px solid ${warning ? 'rgba(239, 68, 68, 0.25)' : 'rgba(96, 165, 250, 0.25)'}`,
      borderRadius: '8px',
      padding: '20px 24px',
      marginBottom: '16px',
      fontSize: '14px',
      lineHeight: '1.7',
      color: warning ? '#fca5a5' : '#93c5fd',
    }}>
      {children}
    </div>
  );
}
