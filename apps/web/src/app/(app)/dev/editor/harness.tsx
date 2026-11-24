'use client';

import { BUILTIN_TEMPLATES, eventSettingsSchema, type EventDto } from '@cardai/shared';
import { Editor } from '@/features/editor/editor';

const ID = '00000000-0000-4000-8000-000000000001';

const EVENT: EventDto = {
  id: ID,
  slug: 'rahul-priya',
  status: 'draft',
  type: 'wedding',
  language: 'en',
  secondaryLanguage: null,
  community: null,
  templateId: BUILTIN_TEMPLATES[0]!.id,
  title: 'Rahul & Priya — Wedding',
  content: {
    invocation: '|| Shree Ganeshaya Namah ||',
    headline: 'Wedding Invitation',
    hostLine: 'Mrs. Sunita & Mr. Ramesh Sharma request the pleasure of your company',
    primaryNames: ['Rahul', 'Priya'],
    primaryDetails: ['Son of Mr. Ramesh Sharma', 'Daughter of Mr. Suresh Verma'],
    connector: 'weds',
    message: 'Your gracious presence will make our celebration complete.',
    familyTitle: 'With best compliments',
    familyLines: ['The Sharma Family', 'The Verma Family'],
    closing: 'Awaiting your blessings',
  },
  settings: eventSettingsSchema.parse({}),
  design: null,
  functions: [{ id: 'f1', sortOrder: 0, name: 'Wedding', startsAt: '2026-12-11T20:00:00+05:30', venueName: 'Rambagh Palace, Jaipur', venueAddress: 'Bhawani Singh Road, Jaipur' }],
  features: [],
  credits: {},
  viewCount: 0,
  access: 'owner',
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
} as EventDto;

let aiUsed = 1;
let packCredits = 0;
const myTemplates: unknown[] = [];
let renderPolls = 0;
let PHOTO_URL: string | null = null;

/** Stubs `/api/*` in the browser so the editor runs without the backend. */
function installStub() {
  if (typeof window === 'undefined' || (window as { __editorStub?: boolean }).__editorStub) return;
  (window as { __editorStub?: boolean }).__editorStub = true;
  // `?template=gubbare-ice-blue&type=birthday` opens another design (dev review).
  const q = new URLSearchParams(location.search);
  const pick = q.get('template');
  if (pick && BUILTIN_TEMPLATES.some((t) => t.id === pick)) EVENT.templateId = pick;
  // `?photo=1`: the event has one photo, so photo frames show a real picture (crop/roundness review).
  if (q.get('photo')) {
    const portrait = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3D97B8"/><stop offset="1" stop-color="#1F5F7A"/></linearGradient></defs><rect width="900" height="1200" fill="url(#b)"/><ellipse cx="450" cy="1250" rx="380" ry="420" fill="#E9EEF3"/><path d="M290 1000 L610 1000 L560 860 L340 860 Z" fill="#D9A07F"/><ellipse cx="450" cy="560" rx="170" ry="210" fill="#E3AE8C"/><path d="M270 560 C250 330 650 300 640 560 C640 470 560 400 450 400 C340 400 270 470 270 560 Z M270 560 C250 760 300 900 330 960 L300 960 C230 820 240 680 270 560 Z M630 560 C650 760 600 900 570 960 L600 960 C670 820 660 680 630 560 Z" fill="#3A2418"/><circle cx="390" cy="560" r="12" fill="#3A2418"/><circle cx="510" cy="560" r="12" fill="#3A2418"/><path d="M405 660 Q450 690 495 660" stroke="#B5524A" stroke-width="10" fill="none" stroke-linecap="round"/></svg>`;
    EVENT.settings = { ...EVENT.settings, photoAssetIds: ['p1'] };
    PHOTO_URL = `data:image/svg+xml;utf8,${encodeURIComponent(portrait)}`;
  }
  if (q.get('type') === 'birthday') {
    Object.assign(EVENT, { type: 'birthday', title: 'Juliana — Birthday' });
    EVENT.content = { ...EVENT.content, headline: 'You are invited to', primaryNames: ['Juliana Silva'], primaryDetails: [], message: '18th Birthday Party' };
  }
  const real = window.fetch.bind(window);
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const path = new URL(url, location.origin).pathname;
    if (!path.startsWith('/api/')) return real(input, init);
    const method = (init?.method ?? 'GET').toUpperCase();
    await new Promise((r) => setTimeout(r, 120));
    if (path === `/api/events/${ID}` && method === 'GET') return json(EVENT);
    if (path === `/api/events/${ID}/design` && method === 'PUT') return json({ ok: true });
    if (path === `/api/events/${ID}/media`) return json({ items: PHOTO_URL ? [{ id: 'p1', url: PHOTO_URL, kind: 'photo', contentType: 'image/png', width: 900, height: 1200, createdAt: new Date().toISOString() }] : [] });
    if (path.startsWith('/api/templates')) return json({ items: BUILTIN_TEMPLATES });
    if (path === `/api/ai/quota/${ID}`) return json({ background: { used: aiUsed, included: 3, credits: packCredits, remaining: 3 - aiUsed + packCredits, upgraded: false }, configured: true });
    if (path === '/api/ai/images') {
      const body = JSON.parse(String(init?.body ?? '{}')) as { kind: string };
      if (body.kind === 'background') {
        if (aiUsed < 3) aiUsed++;
        else if (packCredits > 0) packCredits--;
        else return json({ message: 'No AI backgrounds left for this invitation. Get the AI Background Pack to make more.' }, 402);
      }
      // A solid-colour stand-in so the flow can be clicked through without a model.
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><defs><radialGradient id="g"><stop offset="0" stop-color="#F6D6A8"/><stop offset="1" stop-color="#7A1F3D"/></radialGradient></defs><rect width="1080" height="1920" fill="url(#g)"/></svg>`;
      return json({ id: crypto.randomUUID(), kind: 'ai_image', url: `data:image/svg+xml,${encodeURIComponent(svg)}`, contentType: 'image/svg+xml', width: 1080, height: 1920, createdAt: new Date().toISOString() }, 201);
    }
    if (path === '/api/payments/orders') return json({ orderId: crypto.randomUUID(), providerOrderId: 'order_mock', keyId: 'mock', amountPaise: 4900, currency: 'INR' });
    if (path === '/api/payments/verify') {
      packCredits += 10;
      return json({ ok: true });
    }
    if (path === '/api/me/templates' && method === 'GET') return json({ items: myTemplates });
    if (path === '/api/me/templates' && method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
      const t = { id: crypto.randomUUID(), name: body.name, eventType: body.eventType, design: body.design, createdAt: new Date().toISOString() };
      myTemplates.unshift(t);
      return json(t, 201);
    }
    if (path.startsWith('/api/me/templates/') && method === 'DELETE') {
      myTemplates.splice(myTemplates.findIndex((t) => (t as { id: string }).id === path.split('/').pop()), 1);
      return new Response(null, { status: 204 });
    }
    if (path === '/api/renders' || path.startsWith('/api/renders/')) {
      renderPolls = path === '/api/renders' ? 0 : renderPolls + 1;
      const done = renderPolls >= 2;
      return json({ id: 'r1', eventId: ID, format: 'image', status: done ? 'completed' : 'processing', progress: done ? 100 : 40 * renderPolls + 10, watermark: true, outputs: done ? [{ url: '/showcase/alpana-ivory.jpg', contentType: 'image/jpeg', bytes: 248000 }] : [], error: null, createdAt: new Date().toISOString() });
    }
    if (path === `/api/events/${ID}` && method === 'PATCH') return json({ ...EVENT, ...JSON.parse(String(init?.body ?? '{}')) });
    return json({ message: 'Not stubbed' }, 404);
  };
}

installStub();

export function EditorHarness() {
  return <Editor eventId={ID} />;
}
