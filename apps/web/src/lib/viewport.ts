import type { Metadata, Viewport } from 'next';

/**
 * Full-screen editors have their own pinch-zoom on the canvas, so the browser's page zoom is
 * turned off there: it fought the canvas gestures and iOS zoomed in on every field tap.
 */
export const EDITOR_VIEWPORT: Viewport = {
  themeColor: '#FBF8F3',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

/**
 * Signed-in and internal screens: robots.txt already keeps crawlers out, and this keeps any URL
 * that leaks (a shared editor link, say) out of search results too.
 */
export const PRIVATE_ROBOTS: Metadata['robots'] = { index: false, follow: false };
