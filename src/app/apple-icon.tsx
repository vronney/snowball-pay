import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';
export const runtime = 'edge';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: '#0d1424',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Small ball */}
        <div
          style={{
            position: 'absolute',
            left: 18,
            top: 105,
            width: 45,
            height: 45,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 28%, #93c5fd, #1e3a8a)',
          }}
        />
        {/* Medium ball */}
        <div
          style={{
            position: 'absolute',
            left: 52,
            top: 75,
            width: 75,
            height: 75,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 28%, #7dd3fc, #1e3a8a)',
          }}
        />
        {/* Large ball */}
        <div
          style={{
            position: 'absolute',
            left: 80,
            top: 18,
            width: 112,
            height: 112,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 36% 26%, #60a5fa, #0f2060)',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
