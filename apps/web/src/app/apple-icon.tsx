import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** iOS home-screen icon: the Noyta mark on a full-bleed plum square (iOS rounds the corners itself). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#4A1D4F' }}>
        <svg width="180" height="180" viewBox="0 0 32 32">
          <path d="M10.5 25v-7.5a5.5 5.5 0 0 1 11 0V25" fill="none" stroke="#FAF8F6" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M16 3.8c1.7 2 2.3 3.3 2.3 4.3a2.3 2.3 0 0 1-4.6 0c0-1 .6-2.3 2.3-4.3Z" fill="#E6C98A" />
        </svg>
      </div>
    ),
    size,
  );
}
