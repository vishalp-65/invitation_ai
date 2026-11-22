import { BRAND } from '@cardai/shared';
import type { MetadataRoute } from 'next';

/** Web app manifest: name and icons for "Add to home screen", and one more icon source for search engines. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name}: Invitation Maker`,
    short_name: BRAND.name,
    description: 'Wedding, griha pravesh, birthday and puja invitations as a card, video and RSVP website, in Hindi and 11 more Indian languages.',
    start_url: '/',
    display: 'standalone',
    background_color: '#050608',
    theme_color: '#050608',
    lang: 'en-IN',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
