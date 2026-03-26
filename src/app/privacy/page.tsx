import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Learn how SnowballPay collects, uses, and protects your personal and financial data.',
  alternates: {
    canonical: 'https://getsnowballpay.com/privacy',
  },
  robots: {
    index: true,
    follow: false,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div style={{ backgroundColor: '#f8fafc', color: '#0f172a', minHeight: '100vh' }}>
      {/* Nav */}
      <header style={{ borderBottom: '1px solid rgba(15,23,42,0.08)', padding: '16px 24px', backgroundColor: 'rgba(255,255,255,0.95)' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/">
            <Image src="/logo-dark.svg" alt="SnowballPay" width={130} height={25} />
          </a>
          <a href="/terms" style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none' }}>
            Terms of Service →
          </a>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '56px 24px 80px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', color: '#0f172a' }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '40px' }}>
          Effective date: March 20, 2026 &nbsp;·&nbsp; Last updated: March 20, 2026
        </p>

        <LegalSection>
          <p>
            SnowballPay (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the website and web application
            located at <strong>getsnowballpay.com</strong> (the &ldquo;Service&rdquo;). This Privacy Policy explains
            what personal information we collect, why we collect it, how we use and protect it, and what rights you have
            over it.
          </p>
          <p>
            Please read this policy carefully before using the Service. By creating an account or otherwise using
            SnowballPay, you acknowledge that you have read and understood this policy.
          </p>
        </LegalSection>

        {/* ─── 1. Who We Are ─────────────────────────────────────────────── */}
        <SectionHeading number="1" title="Who We Are" />
        <LegalSection>
          <p>
            SnowballPay is a personal finance planning tool that helps individuals organize and pay off debt using
            the Debt Snowball method. <strong>We are not a bank, credit union, financial institution, broker-dealer,
            investment adviser, or any other type of regulated financial entity.</strong> Nothing we provide
            constitutes financial, investment, tax, or legal advice.
          </p>
          <p>
            For questions about this Privacy Policy, contact us at:{' '}
            <a href="mailto:privacy@getsnowballpay.com" style={{ color: '#2563eb' }}>
              privacy@getsnowballpay.com
            </a>
          </p>
        </LegalSection>

        {/* ─── 2. What Information We Collect ───────────────────────────── */}
        <SectionHeading number="2" title="What Information We Collect" />
        <LegalSection>
          <SubHeading>2.1 Account and Identity Data</SubHeading>
          <p>
            When you sign up through Google (via Auth0), we receive and store:
          </p>
          <ul>
            <li>Your <strong>full name</strong></li>
            <li>Your <strong>email address</strong></li>
            <li>Your <strong>profile picture URL</strong> (hosted by Google)</li>
            <li>An <strong>Auth0 user ID</strong> that links your account across sessions</li>
          </ul>
          <p>
            We do not receive or store your Google account password.
          </p>

          <SubHeading>2.2 Financial Data You Enter</SubHeading>
          <p>
            The core purpose of SnowballPay requires you to provide financial information. We collect and store
            exactly what you enter, including:
          </p>
          <ul>
            <li><strong>Debt information:</strong> debt names, categories (e.g., credit card, student loan), current
              balances, original balances, interest rates (APR), minimum monthly payments, credit limits, and
              payment due dates</li>
            <li><strong>Income information:</strong> monthly take-home pay, income source type (e.g., W-2, 1099),
              and pay frequency</li>
            <li><strong>Expense information:</strong> recurring expense names, amounts, frequencies, and
              categories (e.g., utilities, subscriptions, food)</li>
            <li><strong>Payoff plan data:</strong> your projected debt-free date, total interest projections,
              monthly payment amounts, and the sequencing of your debt payoff steps</li>
            <li><strong>Balance snapshots:</strong> monthly balance records you save to track actual
              progress against your plan</li>
          </ul>

          <SubHeading>2.3 Uploaded Documents</SubHeading>
          <p>
            You may optionally upload financial documents — such as bank statements, credit card statements,
            or pay stubs — in PDF or image format (JPEG, PNG, GIF, WEBP). These files are:
          </p>
          <ul>
            <li>Sent directly to the Anthropic Claude AI API for data extraction (see Section 4)</li>
            <li>Stored in our database as a record of the upload, along with the extracted data in
              structured JSON format</li>
            <li>Associated with your user account via your user ID</li>
          </ul>
          <p>
            <strong>Important:</strong> Before uploading any document, please ensure it does not contain
            sensitive information beyond what is needed (e.g., full account numbers, Social Security numbers).
            We recommend using statements that show only the information relevant to your debt payoff planning.
          </p>

          <SubHeading>2.4 AI-Generated Recommendations</SubHeading>
          <p>
            We generate personalized debt payoff recommendations by sending a summary of your financial data
            (debt balances, interest rates, income, expenses, and payoff timeline) to the Anthropic Claude API.
            The AI-generated output is stored in our database as a cached recommendation associated with
            your account. This cache is refreshed when your underlying financial data changes.
          </p>

          <SubHeading>2.5 Automatically Collected Technical Data</SubHeading>
          <p>
            When you use the Service, we and our infrastructure providers (Vercel) automatically collect
            certain technical information, including:
          </p>
          <ul>
            <li>IP address</li>
            <li>Browser type and version</li>
            <li>Operating system</li>
            <li>Pages visited and actions taken within the Service</li>
            <li>Date and time of requests</li>
            <li>Referring URL</li>
          </ul>
          <p>
            This data is used for security monitoring, performance optimization, and debugging. It is processed
            by Vercel as part of hosting the application (see Section 4).
          </p>

          <SubHeading>2.6 Cookies and Similar Technologies</SubHeading>
          <p>
            We use the following types of cookies and session tokens:
          </p>
          <ul>
            <li>
              <strong>Authentication session cookies:</strong> Auth0 sets a session cookie when you log in
              to keep you authenticated across page loads. This cookie is strictly necessary for the Service
              to function and cannot be disabled without preventing login.
            </li>
            <li>
              <strong>Security tokens:</strong> We use JSON Web Tokens (JWTs) to verify your identity on
              API requests. These are stored in browser memory or session storage, not in persistent cookies.
            </li>
          </ul>
          <p>
            We do not use advertising cookies, third-party tracking cookies, or behavioral analytics cookies.
            We do not serve advertisements.
          </p>
        </LegalSection>

        {/* ─── 3. How We Use Your Information ───────────────────────────── */}
        <SectionHeading number="3" title="How We Use Your Information" />
        <LegalSection>
          <p>We use the information we collect for the following purposes:</p>
          <Table
            headers={['Purpose', 'Legal Basis (GDPR)', 'Data Used']}
            rows={[
              ['Create and manage your account', 'Performance of a contract (Art. 6(1)(b))', 'Name, email, Auth0 ID'],
              ['Provide the debt planning features', 'Performance of a contract (Art. 6(1)(b))', 'All financial data you enter'],
              ['Generate AI debt payoff recommendations', 'Performance of a contract (Art. 6(1)(b))', 'Debt, income, and expense summary data'],
              ['Process uploaded documents for data extraction', 'Performance of a contract (Art. 6(1)(b))', 'Uploaded files (sent to Anthropic API)'],
              ['Maintain and improve the Service', 'Legitimate interests (Art. 6(1)(f))', 'Technical/usage data'],
              ['Ensure security and prevent fraud', 'Legitimate interests (Art. 6(1)(f)) / Legal obligation (Art. 6(1)(c))', 'IP address, access logs'],
              ['Respond to your support requests', 'Legitimate interests (Art. 6(1)(f))', 'Email, account data'],
              ['Comply with legal obligations', 'Legal obligation (Art. 6(1)(c))', 'As required by law'],
            ]}
          />
          <p style={{ marginTop: '16px' }}>
            <strong>We do not sell your personal data.</strong> We do not use your financial data to train
            AI models, build advertising profiles, or share it with data brokers.
          </p>
        </LegalSection>

        {/* ─── 4. Third-Party Service Providers ─────────────────────────── */}
        <SectionHeading number="4" title="Third-Party Service Providers (Subprocessors)" />
        <LegalSection>
          <p>
            We share your data with the following third-party service providers only to the extent necessary
            to operate the Service. Each provider acts as a data processor on our behalf and is bound by
            appropriate data processing agreements and security standards.
          </p>
          <Table
            headers={['Provider', 'Purpose', 'Data Shared', 'Location']}
            rows={[
              [
                'Auth0 (Okta)',
                'User authentication and identity management',
                'Name, email, profile picture; session tokens',
                'USA (with EU data residency options)',
              ],
              [
                'Neon (Neon Inc.)',
                'PostgreSQL database hosting',
                'All data stored in your account (financial data, documents, recommendations)',
                'USA (AWS us-east-1 by default)',
              ],
              [
                'Vercel Inc.',
                'Web application hosting and edge network',
                'Request logs, IP addresses; application code and static assets',
                'USA and global edge network',
              ],
              [
                'Anthropic PBC',
                'AI-powered data extraction from uploaded documents and generation of debt payoff recommendations',
                'Financial data summaries for recommendations; full document content for extraction',
                'USA',
              ],
            ]}
          />

          <SubHeading>Important Notes on Anthropic / Claude API</SubHeading>
          <p>
            When you upload a financial document or request AI recommendations, your data is transmitted
            to Anthropic&apos;s API. Under Anthropic&apos;s API usage policy, when SnowballPay accesses the
            API as an operator:
          </p>
          <ul>
            <li>Anthropic acts as a <strong>data processor</strong>, not a data controller, for the data
              we send via the API</li>
            <li>Your data submitted via the API is <strong>not used by Anthropic to train its AI models</strong>
              under standard API terms (subject to Anthropic&apos;s then-current API Data Privacy Addendum)</li>
            <li>API inputs and outputs may be retained by Anthropic for a limited period for safety and
              abuse monitoring purposes per their policies</li>
          </ul>
          <p>
            You can review Anthropic&apos;s privacy practices at{' '}
            <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer"
               style={{ color: '#2563eb' }}>
              anthropic.com/legal/privacy
            </a>.
          </p>

          <SubHeading>International Data Transfers</SubHeading>
          <p>
            All of our primary service providers are based in the United States. If you are located in the
            European Economic Area (EEA), United Kingdom, or Switzerland, your personal data will be
            transferred to and processed in the United States. We rely on the following transfer mechanisms:
          </p>
          <ul>
            <li>EU Standard Contractual Clauses (SCCs) with our subprocessors where applicable</li>
            <li>The EU-U.S. Data Privacy Framework where providers are certified</li>
          </ul>
          <p>
            We do not transfer personal data to any country that has not been deemed to provide an adequate
            level of protection without appropriate safeguards in place.
          </p>
        </LegalSection>

        {/* ─── 5. Data Retention ────────────────────────────────────────── */}
        <SectionHeading number="5" title="Data Retention" />
        <LegalSection>
          <p>We retain your data as follows:</p>
          <ul>
            <li>
              <strong>Account and financial data:</strong> Retained for as long as your account is active.
              If you delete your account, all associated data — including debts, income, expenses, payoff
              plans, balance snapshots, uploaded document records, and AI recommendation caches — is
              permanently deleted from our production database within <strong>30 days</strong>.
            </li>
            <li>
              <strong>Database backups:</strong> Neon maintains automated database backups. Deleted data
              may persist in backups for up to <strong>30 additional days</strong> before being purged from
              backup storage.
            </li>
            <li>
              <strong>Server logs:</strong> Access and error logs retained by Vercel for up to
              <strong> 30 days</strong> for security and debugging purposes.
            </li>
            <li>
              <strong>Anthropic API logs:</strong> Inputs and outputs sent to the Claude API may be retained
              by Anthropic for a limited period per their policies. We do not control this retention period;
              please review Anthropic&apos;s privacy policy for details.
            </li>
          </ul>
        </LegalSection>

        {/* ─── 6. Data Security ─────────────────────────────────────────── */}
        <SectionHeading number="6" title="Data Security" />
        <LegalSection>
          <p>
            We implement reasonable technical and organizational measures to protect your personal and
            financial data, including:
          </p>
          <ul>
            <li><strong>Encryption in transit:</strong> All data transmitted between your browser and our
              servers uses TLS (HTTPS). All API calls to third-party services use HTTPS.</li>
            <li><strong>Encryption at rest:</strong> Your data stored in Neon&apos;s PostgreSQL database
              is encrypted at rest using AES-256 encryption.</li>
            <li><strong>Authentication security:</strong> Authentication is handled by Auth0, which provides
              industry-standard OAuth 2.0 / OpenID Connect flows. We do not store passwords.</li>
            <li><strong>Access controls:</strong> Database access is restricted to authenticated API routes.
              Each API request verifies your identity before accessing or modifying your data. Data is
              always scoped to your user ID — you cannot access another user&apos;s data.</li>
            <li><strong>File validation:</strong> Uploaded documents are validated for file type and size
              before processing. Files are not permanently stored on our servers; they are processed
              in-memory and only the extracted metadata is persisted to the database.</li>
            <li><strong>Infrastructure security:</strong> Neon maintains SOC 2 Type II and ISO 27001
              certifications. Vercel operates on enterprise-grade cloud infrastructure.</li>
          </ul>
          <p>
            <strong>No security system is perfect.</strong> While we take data security seriously, we cannot
            guarantee absolute security of your data. If you believe your account has been compromised,
            please contact us immediately at{' '}
            <a href="mailto:security@getsnowballpay.com" style={{ color: '#2563eb' }}>
              security@getsnowballpay.com
            </a>.
          </p>
          <p>
            In the event of a personal data breach that is likely to result in a risk to your rights and
            freedoms, we will notify the relevant supervisory authority within 72 hours of becoming aware
            of the breach, and we will notify affected users without undue delay where required by law.
          </p>
        </LegalSection>

        {/* ─── 7. Your Rights ───────────────────────────────────────────── */}
        <SectionHeading number="7" title="Your Privacy Rights" />
        <LegalSection>
          <SubHeading>7.1 Rights for All Users</SubHeading>
          <p>Regardless of where you live, you have the right to:</p>
          <ul>
            <li><strong>Access your data:</strong> Request a copy of the personal data we hold about you</li>
            <li><strong>Delete your account:</strong> Request that we delete your account and all associated
              data. You can do this at any time by contacting us.</li>
            <li><strong>Correct inaccuracies:</strong> Update any inaccurate information through the app
              interface or by contacting us</li>
            <li><strong>Data portability:</strong> Request an export of your financial data in a
              machine-readable format (JSON)</li>
          </ul>

          <SubHeading>7.2 Rights for EEA, UK, and Swiss Residents (GDPR)</SubHeading>
          <p>
            If you are located in the European Economic Area, United Kingdom, or Switzerland, you have
            additional rights under the General Data Protection Regulation (GDPR) or equivalent law:
          </p>
          <ul>
            <li><strong>Right to be informed</strong> (Art. 13-14): You have the right to be informed about
              how we use your data — which this policy fulfills.</li>
            <li><strong>Right of access</strong> (Art. 15): Request a copy of your personal data and
              information about how it is processed.</li>
            <li><strong>Right to rectification</strong> (Art. 16): Request correction of inaccurate or
              incomplete personal data.</li>
            <li><strong>Right to erasure</strong> (Art. 17): Request deletion of your personal data where
              there is no compelling reason for us to continue processing it.</li>
            <li><strong>Right to restrict processing</strong> (Art. 18): Request that we restrict processing
              of your personal data in certain circumstances.</li>
            <li><strong>Right to data portability</strong> (Art. 20): Receive your personal data in a
              structured, commonly used, machine-readable format.</li>
            <li><strong>Right to object</strong> (Art. 21): Object to processing based on our legitimate
              interests. We will stop unless we have compelling legitimate grounds that override your
              interests.</li>
            <li><strong>Rights related to automated decision-making</strong> (Art. 22): While our AI
              recommendations are generated automatically, they are presented as informational suggestions
              only and do not produce legal effects or similarly significant effects on you. No binding
              decisions are made solely by automated means.</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:privacy@getsnowballpay.com" style={{ color: '#2563eb' }}>
              privacy@getsnowballpay.com
            </a>. We will respond within <strong>30 days</strong> (extendable to 60 days for complex
            requests, with notice to you). We may need to verify your identity before processing your request.
          </p>
          <p>
            If you are unsatisfied with our response, you have the right to lodge a complaint with your
            local data protection supervisory authority. In the EU, you can find your authority at{' '}
            <a href="https://edpb.europa.eu/about-edpb/about-edpb/members_en" target="_blank"
               rel="noopener noreferrer" style={{ color: '#2563eb' }}>
              edpb.europa.eu
            </a>.
          </p>

          <SubHeading>7.3 Rights for California Residents (CCPA / CPRA)</SubHeading>
          <p>
            If you are a California resident, the California Consumer Privacy Act (CCPA) as amended by
            the California Privacy Rights Act (CPRA) provides you with specific rights:
          </p>
          <ul>
            <li>
              <strong>Right to Know:</strong> You have the right to know what categories of personal
              information we collect, the purposes for which we use it, and whether we sell or share it.
              This policy provides that information. You may also request the specific pieces of personal
              information we have collected about you in the past 12 months.
            </li>
            <li>
              <strong>Right to Delete:</strong> You have the right to request that we delete personal
              information we have collected from you, subject to certain exceptions under California law.
            </li>
            <li>
              <strong>Right to Correct:</strong> You have the right to request correction of inaccurate
              personal information we maintain about you.
            </li>
            <li>
              <strong>Right to Opt-Out of Sale or Sharing:</strong> We do <strong>not sell</strong> your
              personal information and do <strong>not share</strong> it for cross-context behavioral
              advertising. There is nothing to opt out of.
            </li>
            <li>
              <strong>Right to Limit Use of Sensitive Personal Information:</strong> We collect financial
              data that may constitute &ldquo;sensitive personal information&rdquo; under the CPRA. We use
              this data solely to provide the debt planning features you request and for no secondary
              purposes.
            </li>
            <li>
              <strong>Right to Non-Discrimination:</strong> We will not discriminate against you for
              exercising any of these rights. We will not deny you Service, charge you different prices,
              or provide a different quality of service because you exercised your privacy rights.
            </li>
          </ul>
          <p>
            <strong>Categories of personal information collected in the past 12 months:</strong>
          </p>
          <ul>
            <li>Identifiers (name, email, IP address)</li>
            <li>Financial information (debt balances, interest rates, income, expenses)</li>
            <li>Internet or other electronic network activity information (usage logs)</li>
            <li>Sensitive personal information (financial account details entered by you)</li>
          </ul>
          <p>
            To submit a verifiable consumer request, contact us at{' '}
            <a href="mailto:privacy@getsnowballpay.com" style={{ color: '#2563eb' }}>
              privacy@getsnowballpay.com
            </a>. We will respond within <strong>45 days</strong> (extendable to 90 days with notice).
            You may make a request on behalf of yourself or, if you are a parent or guardian, on behalf
            of your minor child.
          </p>
        </LegalSection>

        {/* ─── 8. Children's Privacy ────────────────────────────────────── */}
        <SectionHeading number="8" title="Children's Privacy" />
        <LegalSection>
          <p>
            SnowballPay is intended for users who are <strong>18 years of age or older</strong>. We do not
            knowingly collect personal information from children under 13 (or under 16 for EEA residents).
            If you believe a child has provided us with personal information without parental consent,
            please contact us and we will delete that information promptly.
          </p>
        </LegalSection>

        {/* ─── 9. Do Not Track ──────────────────────────────────────────── */}
        <SectionHeading number="9" title="Do Not Track Signals" />
        <LegalSection>
          <p>
            Some browsers send &ldquo;Do Not Track&rdquo; (DNT) signals. Because we do not engage in cross-site
            tracking or behavioral advertising, there is no material difference in how the Service functions
            whether or not a DNT signal is received. We do not currently respond to DNT signals in a
            technically differentiated way.
          </p>
        </LegalSection>

        {/* ─── 10. Links to Other Sites ─────────────────────────────────── */}
        <SectionHeading number="10" title="Links to Other Websites" />
        <LegalSection>
          <p>
            The Service may contain links to external websites or resources. We are not responsible for
            the privacy practices of those sites. We encourage you to review the privacy policies of any
            external sites you visit.
          </p>
        </LegalSection>

        {/* ─── 11. Changes to This Policy ───────────────────────────────── */}
        <SectionHeading number="11" title="Changes to This Privacy Policy" />
        <LegalSection>
          <p>
            We may update this Privacy Policy from time to time. When we make material changes, we will:
          </p>
          <ul>
            <li>Update the &ldquo;Last updated&rdquo; date at the top of this page</li>
            <li>Notify you by email (to the address associated with your account) at least 14 days
              before the changes take effect</li>
            <li>For changes that materially affect how we process your financial data, we will ask for
              your renewed consent where required by law</li>
          </ul>
          <p>
            Continued use of the Service after changes take effect constitutes acceptance of the
            updated policy.
          </p>
        </LegalSection>

        {/* ─── 12. Contact Us ───────────────────────────────────────────── */}
        <SectionHeading number="12" title="Contact Us" />
        <LegalSection>
          <p>For any privacy-related questions, requests, or concerns, please contact us:</p>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', borderRadius: '8px', padding: '20px', marginTop: '12px' }}>
            <p style={{ margin: 0, lineHeight: '2' }}>
              <strong>SnowballPay</strong><br />
              Email:{' '}
              <a href="mailto:privacy@getsnowballpay.com" style={{ color: '#2563eb' }}>
                privacy@getsnowballpay.com
              </a><br />
              Website:{' '}
              <a href="https://getsnowballpay.com" style={{ color: '#2563eb' }}>
                getsnowballpay.com
              </a>
            </p>
          </div>
        </LegalSection>

        {/* Footer nav */}
        <div style={{ marginTop: '64px', paddingTop: '24px', borderTop: '1px solid rgba(15,23,42,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/" style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none' }}>
            ← Back to SnowballPay
          </a>
          <a href="/terms" style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none' }}>
            Terms of Service →
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
      color: '#0f172a',
      marginTop: '40px',
      marginBottom: '12px',
      paddingBottom: '8px',
      borderBottom: '1px solid rgba(15,23,42,0.08)',
    }}>
      {number}. {title}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#334155', marginTop: '20px', marginBottom: '8px' }}>
      {children}
    </h3>
  );
}

function LegalSection({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '15px',
      lineHeight: '1.75',
      color: '#475569',
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

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: 'auto', marginTop: '12px', marginBottom: '12px' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '14px',
        color: '#475569',
      }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} style={{
                textAlign: 'left',
                padding: '10px 12px',
                backgroundColor: 'rgba(15,23,42,0.04)',
                color: '#1e293b',
                fontWeight: 600,
                borderBottom: '1px solid rgba(15,23,42,0.08)',
                whiteSpace: 'nowrap',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(15,23,42,0.05)' }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
