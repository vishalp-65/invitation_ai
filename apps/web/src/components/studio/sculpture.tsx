'use client';

import { Instrument_Serif } from 'next/font/google';
import { useEffect, useState } from 'react';
import SculptureHero from '@/components/ui/liquid-sculpture-hero';
import { useLite } from '@/lib/perf';

// Only this section uses the italic serif, so it is not preloaded with every page.
const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['italic'], display: 'swap', preload: false });

/*
 * The sculpture images carry a flat backdrop, and the shader tints them by (section bg / image bg).
 * Light: the page's ivory, so the section melts into the page. Dark: the dark image's own ground
 * (#111110), which keeps the metal bright; soft fades at the edges hide the step to the page black.
 */
const LIGHT_BG = '#F7F6F2';
const DARK_BG = '#111110';

/** Follows <html data-theme> (set by ThemeSync), so the sculpture swaps with the site theme. */
function useSiteTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setTheme(root.dataset.theme === 'light' ? 'light' : 'dark');
    read();
    const mo = new MutationObserver(read);
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return theme;
}

/**
 * "Atelier" interlude: an interactive liquid-metal sculpture (WebGL2 particles; a still image
 * without it). Moving across it turns the metal liquid, then it settles back. Low-end devices get
 * the still image with fewer particles and no interaction.
 */
export function StudioSculpture({ hi }: { hi: boolean }) {
  const theme = useSiteTheme();
  const lite = useLite();

  return (
    <div className="noyta-sculpt relative">
      <style>{`
        .noyta-sculpt .sh-root{min-height:640px}
        .noyta-sculpt .sh-eyebrow{font-family:var(--font-mono);letter-spacing:.08em}
        .noyta-sculpt .sh-accent:lang(hi),.noyta-sculpt:lang(hi) .sh-accent{font-style:normal;font-family:var(--font-display);font-weight:500}
        .noyta-sculpt .sh-credit{opacity:.28}
      `}</style>
      <SculptureHero
        id="atelier"
        ariaLabel={hi ? 'नोयटा एटेलियर' : 'The Noyta atelier'}
        headingAs="h2"
        showNav={false}
        themeToggle={false}
        loadFonts={false}
        theme={theme}
        background={LIGHT_BG}
        darkBackground={DARK_BG}
        headingFont="var(--font-display)"
        bodyFont="var(--font-sans)"
        accentFont={`${serif.style.fontFamily}, var(--font-deva), serif`}
        height="100svh"
        backdropText="noyta"
        eyebrow={hi ? 'नोयटा एटेलियर' : 'The Noyta atelier'}
        headline={hi ? 'हर निमंत्रण,\nहाथों से सँवारा।' : 'Every invitation,\nfinished by hand.'}
        headlineAccent={hi ? 'हाथों से सँवारा।' : 'finished by hand.'}
        body={
          hi
            ? 'हर डिज़ाइन पेंट की हुई कला और आपकी लिपि में सधे अक्षरों से शुरू होता है। फिर AI आपके नाम, तारीख़ और कहानी भरता है, ताकि कार्ड, वीडियो और वेबसाइट, तीनों एक ही परिवार के लिए बने लगें।'
            : 'Every design begins as painted art and type set in your own script. Then AI fills in your names, dates and story, so the card, the video and the website all feel made for one family.'
        }
        primaryCta={{ label: hi ? 'डिज़ाइन देखें' : 'Browse designs', href: '/templates' }}
        secondaryCta={{ label: hi ? 'कैसे काम करता है' : 'See how it works', href: '#how-it-works' }}
        hint={hi ? 'धातु पर कर्सर घुमाइए' : 'Move across the metal'}
        hintTouch={hi ? 'धातु को छूकर देखिए' : 'Touch the metal'}
        imageAlt={hi ? 'धातु के धागों से बनी एक अमूर्त मूर्ति' : 'Abstract sculpture of interwoven metallic filaments'}
        interactive={!lite}
        particleDensity={lite ? 0.35 : 1}
        strength={1.1}
        radius={240}
        liquid={1.2}
        intro={!lite}
        showCredit
      />
      {/* Soft hand-off to the page background above and below (pointer-events off: the metal stays live). */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-ivory to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-ivory to-transparent" />
    </div>
  );
}
