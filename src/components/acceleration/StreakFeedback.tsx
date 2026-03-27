'use client';

import { Flame } from 'lucide-react';

type Level = 'excellent' | 'good' | 'warning' | 'poor';

const LEVEL_COLORS: Record<Level, { bg: string; borderLeft: string; border: string; text: string }> = {
  excellent: { bg: 'rgba(16,185,129,0.06)',  borderLeft: '#10b981', border: 'rgba(16,185,129,0.15)', text: '#065f46' },
  good:      { bg: 'rgba(37,99,235,0.05)',   borderLeft: '#2563eb', border: 'rgba(37,99,235,0.15)',  text: '#1e3a8a' },
  warning:   { bg: 'rgba(245,158,11,0.06)',  borderLeft: '#f59e0b', border: 'rgba(245,158,11,0.2)',  text: '#92400e' },
  poor:      { bg: 'rgba(239,68,68,0.06)',   borderLeft: '#ef4444', border: 'rgba(239,68,68,0.15)',  text: '#7f1d1d' },
};

interface StreakFeedbackProps {
  streak: number;
  feedback: { level: Level; message: string } | null;
}

export default function StreakFeedback({ streak, feedback }: StreakFeedbackProps) {
  return (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {/* Streak counter */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: streak >= 2 ? 'rgba(239,68,68,0.06)' : '#f8fafc',
        border: `1px solid ${streak >= 2 ? 'rgba(239,68,68,0.15)' : 'rgba(15,23,42,0.07)'}`,
        borderRadius: '8px', padding: '10px 14px', flexShrink: 0,
      }}>
        <Flame size={18} style={{ color: streak >= 1 ? '#dc2626' : '#cbd5e1' }} />
        <div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: streak >= 1 ? '#dc2626' : '#94a3b8', lineHeight: 1 }}>
            {streak}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, marginTop: '1px' }}>month streak</div>
        </div>
      </div>

      {/* Feedback message */}
      {feedback && (
        <div style={{
          flex: '1 1 180px',
          background: LEVEL_COLORS[feedback.level].bg,
          border: `1px solid ${LEVEL_COLORS[feedback.level].border}`,
          borderLeft: `3px solid ${LEVEL_COLORS[feedback.level].borderLeft}`,
          borderRadius: '8px',
          padding: '10px 12px',
        }}>
          <p style={{ margin: 0, fontSize: '12px', color: LEVEL_COLORS[feedback.level].text, lineHeight: 1.55 }}>
            {feedback.message}
          </p>
        </div>
      )}
    </div>
  );
}
