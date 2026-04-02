import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Row,
  Column,
  Hr,
  Button,
} from '@react-email/components';
import * as React from 'react';

interface PayoffItem {
  debtName: string;
  category: string;
  originalBalance: number;
  monthPaidOff: number;
  interestPaid: number;
  orderInPayoff: number;
}

interface ContentItem {
  type: string;
  title: string;
  body: string;
}

interface PayoffPlanEmailProps {
  userName?: string;
  totalDebt: number;
  totalInterestPaid: number;
  monthlyPayment: number;
  debtFreeDate: string;
  payoffSchedule: PayoffItem[];
  method: string;
  featuredContent?: ContentItem | null;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

const CATEGORY_COLORS: Record<string, string> = {
  'Credit Card':    '#ef4444',
  'Student Loan':   '#8b5cf6',
  'Auto Loan':      '#f59e0b',
  'Mortgage':       '#0ea5e9',
  'Personal Loan':  '#10b981',
  'Medical Debt':   '#f97316',
  'Other':          '#64748b',
};

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? '#64748b';
}

export function PayoffPlanEmail({
  userName,
  totalDebt,
  totalInterestPaid,
  monthlyPayment,
  debtFreeDate,
  payoffSchedule,
  method,
  featuredContent,
}: PayoffPlanEmailProps) {
  const safeUserName = userName?.replace(/<[^>]*>/g, '').trim();
  const isEmail = !!safeUserName && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeUserName);
  const displayName = isEmail ? safeUserName?.split('@')[0] : safeUserName;

  const methodLabel =
    method === 'avalanche' ? 'Debt Avalanche'
    : method === 'custom'  ? 'Custom Priority'
    : 'Debt Snowball';

  const methodDesc =
    method === 'avalanche'
      ? 'Highest interest rate first — minimizes total interest paid.'
      : method === 'custom'
      ? 'Your custom priority order.'
      : 'Smallest balance first — builds momentum with quick wins.';

  const totalDebts = payoffSchedule.length;

  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#f1f5f9', margin: 0, padding: '32px 0' }}>
        <Container style={{ maxWidth: '680px', margin: '0 auto' }}>

          {/* ── Hero ───────────────────────────────────────── */}
          <Section style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #4f46e5 100%)', borderRadius: '16px 16px 0 0', padding: '40px 48px 36px' }}>
            {/* Wordmark */}
            <Text style={{ margin: '0 0 28px', fontSize: '18px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              SnowballPay
            </Text>

            <Heading style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: '1.15' }}>
              Your Debt Payoff Plan
            </Heading>

            {displayName && (
              <Text style={{ margin: '0 0 16px', fontSize: '16px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.5' }}>
                Hi {displayName} — here&apos;s your personalized roadmap to becoming debt-free.
              </Text>
            )}

            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', borderRadius: '999px', padding: '5px 14px', border: '1px solid rgba(255,255,255,0.25)' }}>
              <Text style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#ffffff', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {methodLabel} Strategy
              </Text>
            </div>
          </Section>

          {/* ── Debt-Free Date Callout ─────────────────────── */}
          <Section style={{ background: '#ffffff', padding: '0 48px' }}>
            <div style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', borderRadius: '12px', padding: '24px 28px', margin: '28px 0', border: '1px solid #a7f3d0', textAlign: 'center' }}>
              <Text style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                🎯 Estimated Debt-Free Date
              </Text>
              <Text style={{ margin: 0, fontSize: '36px', fontWeight: 900, color: '#059669', letterSpacing: '-0.03em', lineHeight: '1.1' }}>
                {debtFreeDate}
              </Text>
              <Text style={{ margin: '8px 0 0', fontSize: '13px', color: '#047857' }}>
                Stay consistent and you&apos;ll eliminate {fmt(totalDebt)} across {totalDebts} debt{totalDebts !== 1 ? 's' : ''}.
              </Text>
            </div>
          </Section>

          {/* ── Stats Grid ────────────────────────────────── */}
          <Section style={{ background: '#ffffff', padding: '0 48px 28px' }}>
            <Text style={{ margin: '0 0 14px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Plan Summary
            </Text>
            <Row>
              <Column style={{ width: '50%', paddingRight: '8px' }}>
                <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '18px 20px', border: '1px solid #fecaca' }}>
                  <Text style={{ margin: '0 0 4px', fontSize: '11px', color: '#ef4444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Debt</Text>
                  <Text style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>{fmt(totalDebt)}</Text>
                </div>
              </Column>
              <Column style={{ width: '50%', paddingLeft: '8px' }}>
                <div style={{ background: '#eff6ff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #bfdbfe' }}>
                  <Text style={{ margin: '0 0 4px', fontSize: '11px', color: '#2563eb', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Monthly Payment</Text>
                  <Text style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1d4ed8', lineHeight: 1 }}>{fmt(monthlyPayment)}</Text>
                </div>
              </Column>
            </Row>
            <Row style={{ marginTop: '10px' }}>
              <Column style={{ width: '50%', paddingRight: '8px' }}>
                <div style={{ background: '#fafafa', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0' }}>
                  <Text style={{ margin: '0 0 4px', fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Interest</Text>
                  <Text style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#334155', lineHeight: 1 }}>{fmt(totalInterestPaid)}</Text>
                </div>
              </Column>
              <Column style={{ width: '50%', paddingLeft: '8px' }}>
                <div style={{ background: '#fafafa', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0' }}>
                  <Text style={{ margin: '0 0 4px', fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Debts to Pay Off</Text>
                  <Text style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#334155', lineHeight: 1 }}>{totalDebts}</Text>
                </div>
              </Column>
            </Row>
          </Section>

          {/* ── Strategy Note ─────────────────────────────── */}
          <Section style={{ background: '#ffffff', padding: '0 48px 28px' }}>
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px 20px', border: '1px solid #e2e8f0', borderLeft: '3px solid #4f46e5' }}>
              <Text style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: 700, color: '#4f46e5' }}>{methodLabel}</Text>
              <Text style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>{methodDesc}</Text>
            </div>
          </Section>

          <Hr style={{ borderColor: '#f1f5f9', margin: '0 48px' }} />

          {/* ── Payoff Schedule ───────────────────────────── */}
          <Section style={{ background: '#ffffff', padding: '28px 48px' }}>
            <Text style={{ margin: '0 0 18px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Payoff Order
            </Text>

            {payoffSchedule.map((item, i) => {
              const mo = item.monthPaidOff % 12;
              const yr = Math.floor(item.monthPaidOff / 12);
              const timeStr = yr > 0 ? `${yr}y ${mo}m` : `${mo}m`;
              const isLast = i === payoffSchedule.length - 1;
              const color = categoryColor(item.category);

              return (
                <div
                  key={item.debtName + i}
                  style={{
                    padding: '14px 0',
                    borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
                  }}
                >
                  <Row>
                    <Column style={{ width: '36px', verticalAlign: 'top', paddingTop: '2px' }}>
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: i === 0 ? '#2563eb' : '#f1f5f9', color: i === 0 ? '#fff' : '#64748b', fontSize: '11px', fontWeight: 700, textAlign: 'center', lineHeight: '26px' }}>
                        {i + 1}
                      </div>
                    </Column>
                    <Column style={{ verticalAlign: 'top' }}>
                      <Text style={{ margin: '0 0 3px', fontSize: '14px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>
                        {item.debtName}
                      </Text>
                      <Row>
                        <Column>
                          <div style={{ display: 'inline-block', background: color + '15', borderRadius: '999px', padding: '2px 8px', marginBottom: '4px' }}>
                            <Text style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: color }}>
                              {item.category}
                            </Text>
                          </div>
                        </Column>
                      </Row>
                      <Text style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
                        {fmt(item.originalBalance)} balance · {fmt(item.interestPaid)} interest
                      </Text>
                    </Column>
                    <Column style={{ width: '72px', textAlign: 'right', verticalAlign: 'top', paddingTop: '2px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-block', background: '#f0fdf4', borderRadius: '6px', padding: '3px 8px', border: '1px solid #bbf7d0' }}>
                        <Text style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#059669' }}>
                          {timeStr}
                        </Text>
                      </div>
                    </Column>
                  </Row>
                </div>
              );
            })}
          </Section>

          {/* ── Featured Content ──────────────────────────── */}
          {featuredContent && (
            <Section style={{ background: '#ffffff', padding: '0 48px 28px' }}>
              <Hr style={{ borderColor: '#f1f5f9', margin: '0 0 28px' }} />
              <div style={{ display: 'inline-block', background: '#f0f9ff', borderRadius: '999px', padding: '4px 12px', marginBottom: '14px', border: '1px solid #bae6fd' }}>
                <Text style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {featuredContent.type === 'article' ? '📖 Article' : featuredContent.type === 'advice' ? '💡 Advice' : '💡 Tip'}
                </Text>
              </div>
              <Heading style={{ margin: '0 0 10px', fontSize: '17px', fontWeight: 700, color: '#0f172a', lineHeight: '1.3' }}>
                {featuredContent.title}
              </Heading>
              <Text style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.7' }}>
                {featuredContent.body}
              </Text>
            </Section>
          )}

          {/* ── CTA ───────────────────────────────────────── */}
          <Section style={{ background: '#ffffff', padding: '4px 48px 36px', textAlign: 'center' }}>
            <Hr style={{ borderColor: '#f1f5f9', margin: '0 0 28px' }} />
            <Text style={{ margin: '0 0 20px', fontSize: '15px', color: '#334155', lineHeight: '1.6' }}>
              Log in to track payments, update balances, and watch your debt-free date get closer every month.
            </Text>
            <Button
              href="https://getsnowballpay.com/dashboard"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                color: '#ffffff',
                borderRadius: '10px',
                padding: '14px 32px',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Open My Dashboard →
            </Button>
          </Section>

          {/* ── Footer ────────────────────────────────────── */}
          <Section style={{ background: '#f8fafc', borderRadius: '0 0 16px 16px', padding: '20px 48px', border: '1px solid #e2e8f0', borderTop: 'none' }}>
            <Text style={{ margin: 0, fontSize: '12px', color: '#94a3b8', textAlign: 'center', lineHeight: '1.6' }}>
              You received this email because you requested your payoff plan on{' '}
              <a href="https://getsnowballpay.com" style={{ color: '#2563eb', textDecoration: 'none' }}>
                SnowballPay
              </a>
              .<br />
              © {new Date().getFullYear()} SnowballPay. All rights reserved.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}
