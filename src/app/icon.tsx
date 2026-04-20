import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';
export const runtime = 'edge';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
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
            left: 3,
            top: 18,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 28%, #93c5fd, #1e3a8a)',
          }}
        />
        {/* Medium ball */}
        <div
          style={{
            position: 'absolute',
            left: 9,
            top: 13,
            width: 13,
            height: 13,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 28%, #7dd3fc, #1e3a8a)',
          }}
        />
        {/* Large ball */}
        <div
          style={{
            position: 'absolute',
            left: 14,
            top: 3,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 36% 26%, #60a5fa, #0f2060)',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
