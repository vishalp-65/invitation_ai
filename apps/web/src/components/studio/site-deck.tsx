import Image from 'next/image';
import { StackingDeck, type DeckCard } from '@/components/ui/scroll-stacking-cards';
import { Frame, Kicker } from './primitives';

type Design = {
  id: string;
  name: string;
  nameHi: string;
  line: string;
  lineHi: string;
  /** Card background, ink and arrow colours, taken from the design itself. */
  bg: string;
  fg: string;
  accent: string;
};

// Screenshots in /public/landing/sites, captured from /dev/sites?d=<id>&open=0 at 412×915.
const DESIGNS: Design[] = [
  {
    id: 'raat-mahal',
    name: 'Raat Mahal',
    nameHi: 'रात महल',
    line: 'Palace arches, hanging lanterns and falling petals for the wedding night.',
    lineHi: 'महल के मेहराब, झूलती लालटेनें और गिरती पंखुड़ियाँ, शादी की रात के लिए।',
    bg: '#5B0F1B',
    fg: '#F7EEDC',
    accent: '#B8862F',
  },
  {
    id: 'gulab-ring',
    name: 'Gulab Ring',
    nameHi: 'गुलाब रिंग',
    line: 'A ring of soft roses in blush and gold, for a light, romantic day.',
    lineHi: 'गुलाबी और सुनहरे गुलाबों की माला, हल्के रोमांटिक दिन के लिए।',
    bg: '#F7E1E6',
    fg: '#5E1426',
    accent: '#A8243A',
  },
  {
    id: 'raat-ki-rani',
    name: 'Raat ki Rani',
    nameHi: 'रात की रानी',
    line: 'Gold on black with drifting sparkles, for a sangeet or reception.',
    lineHi: 'काले पर सुनहरा और चमकते सितारे, संगीत या रिसेप्शन के लिए।',
    bg: '#17120F',
    fg: '#E9D49A',
    accent: '#9C7A22',
  },
  {
    id: 'haldi-rasam',
    name: 'Haldi Rasam',
    nameHi: 'हल्दी रस्म',
    line: 'Marigold strings and turmeric yellow, made for the haldi morning.',
    lineHi: 'गेंदे की लड़ियाँ और हल्दी का पीला, हल्दी की सुबह के लिए।',
    bg: '#FFE89A',
    fg: '#5A2E05',
    accent: '#C05A08',
  },
];

const FEATURES = [
  ['RSVP', 'RSVP'],
  ['Countdown', 'काउंटडाउन'],
  ['Venue map', 'नक्शा'],
  ['Music', 'संगीत'],
] as const;

function Face({ d, i, hi }: { d: Design; i: number; hi: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col sm:grid sm:grid-cols-12" style={{ background: d.bg, color: d.fg }}>
      <div className="relative z-[1] flex flex-col p-6 sm:col-span-7 sm:justify-center sm:p-10 lg:p-16">
        <span className="font-mono text-xs opacity-70">
          {String(i + 1).padStart(2, '0')} / {String(DESIGNS.length).padStart(2, '0')}
        </span>
        <h3 className="mt-3 font-display text-4xl leading-none tracking-tight sm:mt-6 sm:text-5xl lg:text-7xl">{hi ? d.nameHi : d.name}</h3>
        <p className="mt-3 max-w-md text-sm leading-relaxed opacity-80 sm:mt-6 sm:text-base lg:text-lg">{hi ? d.lineHi : d.line}</p>
        <ul className="mt-6 hidden flex-wrap gap-2 sm:flex lg:mt-10">
          {FEATURES.map(([en, h]) => (
            <li key={en} className="rounded-full border px-3 py-1 font-mono text-xs" style={{ borderColor: `${d.fg}55` }}>
              {hi ? h : en}
            </li>
          ))}
        </ul>
      </div>
      {/* The live site's first screen, framed as a phone. On phones it peeks up from the bottom. */}
      <div className="relative min-h-0 flex-1 sm:col-span-5">
        <div className="absolute left-1/2 top-0 w-[62%] -translate-x-1/2 sm:top-[9%] sm:w-[min(62%,300px)] lg:top-[8%]">
          <div className="overflow-hidden rounded-[28px] border-[6px]" style={{ borderColor: d.fg }}>
            <Image src={`/landing/sites/${d.id}.webp`} alt={`${d.name} invitation website on a phone`} width={520} height={1099} sizes="(min-width: 640px) 300px, 60vw" className="block h-auto w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** "Your own invite website": a scroll-dealt deck of real site designs. */
export function StudioSiteDeck({ hi }: { hi: boolean }) {
  const cards: DeckCard[] = DESIGNS.map((d, i) => ({
    id: d.id,
    label: `${d.name}: ${d.line}`,
    title: hi ? 'अपनी वेबसाइट बनाइए' : 'Make yours',
    sub: hi ? `${d.nameHi} डिज़ाइन` : `${d.name} design`,
    href: '/create?type=wedding',
    accent: d.accent,
    face: <Face d={d} i={i} hi={hi} />,
  }));

  return (
    <section id="websites" aria-labelledby="websites-title" className="pt-20 sm:pt-24 lg:pt-32">
      <Frame className="grid gap-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <Kicker className="mb-8">{hi ? 'वेबसाइट' : 'Websites'}</Kicker>
          <h2 id="websites-title" className="display-md">
            {hi ? 'हर निमंत्रण की' : 'Every invite gets'}
            <br />
            <span className="text-ink-soft">{hi ? 'अपनी वेबसाइट।' : 'its own website.'}</span>
          </h2>
        </div>
        <p className="max-w-md text-lg leading-relaxed text-ink-soft lg:col-span-5">
          {hi
            ? 'एक लिंक में सारे फ़ंक्शन, स्थान का नक्शा, काउंटडाउन और RSVP। मेहमान फ़ोन पर खोलें, और कुछ इंस्टॉल न करना पड़े।'
            : 'One link with every function, the venue map, a countdown and RSVP. Guests open it on their phone, with nothing to install.'}
        </p>
      </Frame>
      <StackingDeck cards={cards} className="mt-12 pb-20 sm:mt-0 sm:pb-0" />
    </section>
  );
}
