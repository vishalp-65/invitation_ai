import type { Viewport } from 'next';
import type { ReactNode } from 'react';

/**
 * The editor is an app surface with its own pinch-zoom on the canvas, so the browser's page
 * zoom is turned off here: it fought the canvas gestures and iOS zoomed in on every field tap.
 */
export const viewport: Viewport = {
  themeColor: '#FBF8F3',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

export default function EditorLayout({ children }: { children: ReactNode }) {
  return children;
}
