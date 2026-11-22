import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** iOS home-screen icon: the Noyta arch-and-flame mark on a full-bleed ink square (iOS rounds the corners). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#0B0B0D' }}>
        <svg width="180" height="180" viewBox="0 0 64 64">
          <defs>
            <linearGradient id="nf" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#FBBF24" />
              <stop offset=".45" stopColor="#ECA8D6" />
              <stop offset="1" stopColor="#A78BFA" />
            </linearGradient>
          </defs>
          <path d="M19 50V30c0-8 13-9 13-18 0 9 13 10 13 18v20" fill="none" stroke="#F4F1EC" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M32 30.5c4 4.4 5.8 7.6 5.8 10.4a5.8 5.8 0 0 1-11.6 0c0-2.8 1.8-6 5.8-10.4Z" fill="url(#nf)" />
        </svg>
      </div>
    ),
    size,
  );
}
