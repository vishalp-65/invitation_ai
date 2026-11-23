/**
 * `site_video`: cinematic 9:16 video made from the website's design pack.
 * `status_video`: short "7 days to go" countdown clip for WhatsApp Status (counts from the day it is made).
 */
export const RENDER_FORMATS = ['image', 'pdf', 'print_pdf', 'video', 'site_video', 'status_video'] as const;
export const VIDEO_FORMATS: ReadonlySet<string> = new Set(['video', 'site_video', 'status_video']);
export type RenderFormat = (typeof RENDER_FORMATS)[number];

export const RENDER_STATUSES = ['queued', 'processing', 'completed', 'failed'] as const;
export type RenderStatus = (typeof RENDER_STATUSES)[number];

/** Canvas sizes. Layouts are written in relative units so one template fits all. */
export const CANVAS = {
  /** WhatsApp / Instagram story friendly portrait. */
  story: { width: 1080, height: 1920 },
  /** Low-res preview for free tier (keeps render cost and file size down). */
  storyPreview: { width: 720, height: 1280 },
  /** 5x7 inch at 300 DPI plus 3 mm (≈35 px) bleed on every side. */
  print: { width: 1570, height: 2170, bleedPx: 35 },
} as const;

export const VIDEO = {
  fps: 30,
  /** WhatsApp forwards videos up to 16 MB without re-compressing badly; we aim below. */
  targetMaxBytes: 15 * 1024 * 1024,
  sceneSeconds: {
    intro: 3.5,
    names: 4.5,
    fn: 3.5,
    family: 4,
    outro: 3.5,
  },
} as const;

/** Output quality for paid (watermark-free) renders. Free previews stay at storyPreview size. */
export const RENDER_QUALITY = {
  /** Stills are rendered at 2x (2160x3840) so they stay crisp on large phones and when zoomed in a PDF. */
  stillScale: 2,
  stillJpegQuality: 95,
  /** Video frames are captured at max JPEG quality before x264 encoding (Remotion defaults to 80). */
  videoFrameQuality: 100,
  videoMaxKbps: 9000,
  videoMinKbps: 1500,
} as const;

/** Remotion composition ids (registered in @cardai/templates, rendered by the worker). */
export const COMPOSITION_IDS = {
  card: 'InviteCard',
  cardPrint: 'InviteCardPrint',
  video: 'InviteVideo',
  designCard: 'DesignCard',
  designCardPrint: 'DesignCardPrint',
  designVideo: 'DesignVideo',
  siteVideo: 'SiteVideo',
  statusVideo: 'StatusVideo',
} as const;

/** Print size for layered designs: the 9:16 card at 1.5× (≈4.8×8.5 in at 337 DPI) plus bleed. */
export const DESIGN_PRINT = { width: 1620, height: 2880, bleedPx: 35 } as const;

export const QUEUES = {
  render: 'render',
  aiClip: 'ai-clip',
  notifications: 'notifications',
  email: 'email',
  /** Health checks, daily digest, nightly metrics and partition upkeep. */
  ops: 'ops',
} as const;

export interface RenderJobData {
  renderId: string;
}

export interface AiClipJobData {
  generationId: string;
}

export type NotificationJobData =
  | { kind: 'render.completed'; renderId: string }
  | { kind: 'render.failed'; renderId: string }
  | { kind: 'ai_clip.completed'; generationId: string };
