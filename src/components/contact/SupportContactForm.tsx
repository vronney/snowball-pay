'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
  website: string;
};

const initialState: FormState = {
  name: '',
  email: '',
  subject: '',
  message: '',
  website: '',
};

export default function SupportContactForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string>('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setError('');

    try {
      const response = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to send message right now.');
      }

      setStatus('sent');
      setForm(initialState);
      setTimeout(() => {
        router.replace('/');
      }, 700);
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Unable to send message right now.');
    }
  }

  return (
    <section
      style={{
        maxWidth: '760px',
        margin: '0 auto',
        padding: '36px 24px 64px',
      }}
    >
      <div
        style={{
          borderRadius: '20px',
          border: '1px solid rgba(15,23,42,0.1)',
          background: '#ffffff',
          boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
          padding: '24px',
        }}
      >
        <h1
          style={{
            margin: '0 0 8px',
            fontSize: 'clamp(1.4rem, 3vw, 2rem)',
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.02em',
          }}
        >
          Contact Support
        </h1>
        <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>
          Send us a message directly from this page. If you prefer, you can also email{' '}
          <a href="mailto:support@getsnowballpay.com" style={{ color: '#2563eb', textDecoration: 'none' }}>
            support@getsnowballpay.com
          </a>
          .
        </p>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: '12px' }}>
          <input
            type="text"
            name="website"
            value={form.website}
            onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
            autoComplete="off"
            tabIndex={-1}
            aria-hidden="true"
            style={{ display: 'none' }}
          />

          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Your name"
              maxLength={80}
              style={{
                border: '1px solid rgba(15,23,42,0.16)',
                borderRadius: '10px',
                padding: '11px 12px',
                fontSize: '14px',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Email</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="you@example.com"
              maxLength={180}
              style={{
                border: '1px solid rgba(15,23,42,0.16)',
                borderRadius: '10px',
                padding: '11px 12px',
                fontSize: '14px',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Subject</span>
            <input
              required
              value={form.subject}
              onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
              placeholder="How can we help?"
              maxLength={120}
              style={{
                border: '1px solid rgba(15,23,42,0.16)',
                borderRadius: '10px',
                padding: '11px 12px',
                fontSize: '14px',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Message</span>
            <textarea
              required
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              placeholder="Please include details so we can help quickly."
              rows={7}
              maxLength={4000}
              style={{
                border: '1px solid rgba(15,23,42,0.16)',
                borderRadius: '10px',
                padding: '11px 12px',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
          </label>

          <button
            type="submit"
            disabled={status === 'sending'}
            style={{
              marginTop: '4px',
              border: 'none',
              borderRadius: '10px',
              padding: '11px 16px',
              fontSize: '14px',
              fontWeight: 700,
              color: '#ffffff',
              background: status === 'sending' ? '#94a3b8' : '#2563eb',
              cursor: status === 'sending' ? 'not-allowed' : 'pointer',
            }}
          >
            {status === 'sending' ? 'Sending...' : 'Send Message'}
          </button>
        </form>

        {status === 'sent' && (
          <p style={{ marginTop: '12px', color: '#059669', fontSize: '13px' }}>
            Support request sent. We will reply as soon as possible.
          </p>
        )}
        {status === 'error' && (
          <p style={{ marginTop: '12px', color: '#dc2626', fontSize: '13px' }}>
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
