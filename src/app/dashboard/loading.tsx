// Shown by Next.js App Router while DashboardPage is loading (SSR phase).
// Mirrors the exact DashboardClient layout so there is no layout shift.

const shimmer: React.CSSProperties = {
  background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
  backgroundSize: '200% 100%',
  animation: 'db-shimmer 1.6s ease-in-out infinite',
  borderRadius: '8px',
};

function Bone({ w, h, r }: { w: string | number; h: number; r?: number }) {
  return (
    <div
      style={{
        ...shimmer,
        width: w,
        height: h,
        borderRadius: r ?? 8,
        flexShrink: 0,
      }}
    />
  );
}

export default function DashboardLoading() {
  return (
    <>
      <style>{`
        @keyframes db-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .db-sk-main { margin-left: 240px; }
        @media (max-width: 768px) {
          .db-sk-main { margin-left: 0; }
          .db-sk-sidebar { display: none; }
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f7fa' }}>

        {/* ── Sidebar skeleton ─────────────────────────────────── */}
        <aside
          className="db-sk-sidebar"
          style={{
            width: 240,
            flexShrink: 0,
            background: '#ffffff',
            borderRight: '1px solid rgba(15,23,42,0.07)',
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: 40,
          }}
        >
          {/* Logo area */}
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
            <Bone w={148} h={28} r={6} />
          </div>

          {/* Nav items */}
          <nav style={{ flex: 1, padding: '16px 12px' }}>
            <Bone w={60} h={10} r={4} />
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    ...shimmer,
                    height: 38,
                    borderRadius: 10,
                    animationDelay: `${i * 0.08}s`,
                  }}
                />
              ))}
            </div>

            <div style={{ height: 1, background: 'rgba(15,23,42,0.06)', margin: '16px 8px' }} />
            <Bone w={52} h={10} r={4} />
            <div style={{ marginTop: 12 }}>
              <div style={{ ...shimmer, height: 38, borderRadius: 10, animationDelay: '0.5s' }} />
            </div>
          </nav>

          {/* Logout area */}
          <div style={{ padding: 12, borderTop: '1px solid rgba(15,23,42,0.06)' }}>
            <div style={{ ...shimmer, height: 36, borderRadius: 9, animationDelay: '0.6s' }} />
          </div>
        </aside>

        {/* ── Main column ──────────────────────────────────────── */}
        <div
          className="db-sk-main"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
        >
          {/* Header */}
          <header
            style={{
              background: '#ffffff',
              borderBottom: '1px solid rgba(15,23,42,0.07)',
              padding: '0 24px',
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              position: 'sticky',
              top: 0,
              zIndex: 30,
            }}
          >
            <Bone w={120} h={20} r={6} />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Bone w={36} h={36} r={10} />
              <Bone w={96} h={36} r={10} />
            </div>
          </header>

          {/* Content */}
          <main style={{ flex: 1, padding: 28 }}>
            {/* Summary stat row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    background: '#ffffff',
                    borderRadius: 16,
                    padding: 20,
                    border: '1px solid rgba(15,23,42,0.08)',
                  }}
                >
                  <Bone w="50%" h={12} r={4} />
                  <div style={{ marginTop: 10 }}>
                    <Bone w="70%" h={24} r={6} />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Bone w="40%" h={10} r={4} />
                  </div>
                </div>
              ))}
            </div>

            {/* Debt card skeletons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    background: '#ffffff',
                    borderRadius: 16,
                    padding: '18px 20px',
                    border: '1px solid rgba(15,23,42,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  {/* Icon */}
                  <div style={{ ...shimmer, width: 40, height: 40, borderRadius: 12, animationDelay: `${i * 0.1}s`, flexShrink: 0 }} />

                  {/* Text block */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Bone w="35%" h={14} r={4} />
                    <Bone w="55%" h={10} r={4} />
                    {/* Progress bar */}
                    <div style={{ ...shimmer, height: 6, borderRadius: 999, width: '100%', animationDelay: `${i * 0.1 + 0.1}s` }} />
                  </div>

                  {/* Right amount */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                    <Bone w={64} h={18} r={4} />
                    <Bone w={44} h={10} r={4} />
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
