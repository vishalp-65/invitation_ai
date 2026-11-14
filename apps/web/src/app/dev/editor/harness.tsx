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
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
} as EventDto;

let aiUsed = 1;
let packCredits = 0;
const myTemplates: unknown[] = [];
let renderPolls = 0;

/** Stubs `/api/*` in the browser so the editor runs without the backend. */
function installStub() {
  if (typeof window === 'undefined' || (window as { __editorStub?: boolean }).__editorStub) return;
  (window as { __editorStub?: boolean }).__editorStub = true;
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
    if (path === `/api/events/${ID}/media`) return json({ items: [] });
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
