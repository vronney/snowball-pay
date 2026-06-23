# Information Security Policy — SnowballPay

**Owner:** Founder & Security Lead
**Contact:** security@getsnowballpay.com (monitored)
**Last reviewed:** 2026-06-17
**Review cadence:** At least annually, and upon any material change to systems, vendors, or data handling.

---

## 1. Purpose & Scope

This policy defines how SnowballPay identifies, mitigates, and monitors information
security risks relevant to its business. It applies to all systems, code, vendors, and
personnel involved in operating the SnowballPay application (getsnowballpay.com), with
particular attention to consumer financial data — including data received from the Plaid API.

SnowballPay is a debt-payoff planning application. It connects to consumers' financial
institutions **only** via Plaid Link and consumes the **Liabilities** product to read
account balances, interest rates, and minimum payments for debts the consumer chooses to link.

## 2. Roles & Responsibilities

- The **Security Lead** owns this policy, vendor security posture, access reviews, incident
  response, and remediation of any Plaid-identified gaps.
- All contributors must follow the secure-development rules in
  [`CYBERSECURITY.md`](./CYBERSECURITY.md) before merging changes that touch auth,
  middleware, API routes, or data handling.

## 3. Data Classification

- **Sensitive (consumer financial data):** Plaid Items/access tokens, account balances,
  APRs, minimum payments, and the debts a user records.
- **Personal data:** user email, name, Auth0 identifier, Stripe customer/subscription IDs.
- **Operational:** application logs and analytics (no raw financial credentials are logged).

SnowballPay **never** receives or stores consumers' bank login credentials — Plaid handles
authentication directly with the financial institution.

## 4. Identity & Access Management

- Authentication for end users is provided by **Auth0**, with sessions stored in encrypted,
  httpOnly cookies. Multi-factor authentication (MFA) is enabled for consumers prior to
  surfacing Plaid Link.
- Access to production systems (Vercel, Neon PostgreSQL, Auth0, GitHub, Plaid, Stripe
  dashboards) is restricted to authorized personnel using unique individual accounts under
  least-privilege principles. **MFA is required** on all such administrative accounts.
- No shared accounts. Access is reviewed at least annually and revoked promptly on role change.

## 5. Infrastructure & Network Security

- **Encryption in transit:** All client–server and server–vendor traffic uses TLS 1.2 or
  higher. The application is served over HTTPS via Vercel; database connections require SSL
  (`sslmode=require`).
- **Encryption at rest:** Consumer data, including data received from the Plaid API, is stored
  in Neon-managed PostgreSQL and encrypted at rest using AES-256.
- **Plaid access tokens** are stored in a dedicated `plaid_items` record (one per linked
  institution, not duplicated per account) and protected by database at-rest encryption.
  Application-level field encryption of access tokens is a tracked hardening item.
- Secrets (API keys, database URLs, Plaid/Stripe/Auth0 credentials) are stored only in
  environment variables managed by the hosting platform — never in source control.

## 6. Secure Development & Vulnerability Management

- Dependency vulnerabilities are monitored via `npm audit` (pre-deploy checklist) and
  GitHub Dependabot; high/critical findings are remediated before release.
- Input from all API routes is treated as untrusted and validated server-side.
- Database access uses parameterized Prisma queries (no raw string concatenation).
- Security-relevant changes follow the review rules in `CYBERSECURITY.md`.

## 7. Privacy, Consent, Retention & Deletion

- A public **privacy policy** is published at https://getsnowballpay.com/privacy describing
  data collected, use, retention, encryption, and consumer rights.
- **Consent:** Before Plaid Link is initiated, the user is shown a consent disclosure stating
  the categories of data collected (balances, APR, minimum payments), the purpose (payoff
  tracking only), that credentials are never seen by SnowballPay, and that linked accounts can
  be disconnected at any time.
- **Retention & deletion:** Users may delete their account at any time. Account deletion
  permanently removes all associated data from the production database within 30 days,
  revokes all linked Plaid items via `item/remove`, and removes the stored Plaid access
  tokens. This policy is reviewed at least annually for compliance with applicable data
  privacy laws (e.g., GLBA, CCPA).

## 8. Incident Response

- Suspected security incidents are reported to security@getsnowballpay.com.
- In the event of a Security Breach affecting Plaid End User Data, SnowballPay will notify
  Plaid within **12 hours** of becoming aware, per Plaid MSA Schedule 1 §2c, and will
  cooperate in investigation and remediation.

## 9. Vendor Management

Core subprocessors and their roles: **Vercel** (hosting/compute), **Neon** (PostgreSQL),
**Auth0/Okta** (authentication), **Plaid** (financial data connectivity), **Stripe**
(billing), **Resend** (transactional email), **Anthropic** (AI recommendations — no raw
account credentials sent). Vendor security posture is reviewed before adoption and at least
annually thereafter.

## 10. Policy Review

This policy is reviewed at least annually and after any material change to systems, data
flows, or third-party providers. Changes are recorded via version control.
