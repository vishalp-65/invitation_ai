import { BRAND } from '@cardai/shared';
import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = `${BRAND.name}: wedding and festival invitations as a card, video and RSVP website`;

/** Link preview for WhatsApp, X, Facebook and search: monochrome, matching the site theme. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#050608',
          color: '#F7F6F2',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <svg width="64" height="64" viewBox="0 0 32 32">
            <path d="M10.5 25v-7.5a5.5 5.5 0 0 1 11 0V25" fill="none" stroke="#F7F6F2" strokeWidth="3.4" strokeLinecap="round" />
            <path d="M16 3.8c1.7 2 2.3 3.3 2.3 4.3a2.3 2.3 0 0 1-4.6 0c0-1 .6-2.3 2.3-4.3Z" fill="#F7F6F2" />
          </svg>
          <span style={{ fontSize: 40, letterSpacing: -1 }}>{BRAND.name}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <span style={{ fontSize: 76, lineHeight: 1.05, letterSpacing: -2, maxWidth: 980 }}>
            Wedding & festival invitations, ready in 2 minutes.
          </span>
          <span style={{ fontSize: 30, color: 'rgba(247,246,242,0.6)' }}>
            Card · Video · RSVP website — in Hindi and 11 more Indian languages
          </span>
        </div>
        <span style={{ fontSize: 26, color: 'rgba(247,246,242,0.45)' }}>{BRAND.domain}</span>
      </div>
    ),
    size,
  );
}
