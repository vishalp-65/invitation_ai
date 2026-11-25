import type { SiteDesign } from '@cardai/shared';
import type { CSSProperties } from 'react';

/**
 * 9:16 preview of a layout design (gallery tiles, builder picker): a drawn mock of its first
 * screen, sized in container units so it scales with the tile. No photos needed.
 */
export function LayoutPoster({ design, names = ['Abhishek', 'Kanika'] }: { design: SiteDesign; names?: [string, string] }) {
  const box: CSSProperties = { containerType: 'inline-size' };
  const script = `"${design.fonts.script}", var(--font-display)`;
  const serif = `"${design.fonts.serif}", var(--font-display)`;
  const body = `"${design.fonts.body}", var(--font-sans)`;
  const photo = 'linear-gradient(160deg, #F2C7B5 0%, #C98A7A 45%, #5E3B3B 100%)';

  if (design.layout === 'chat')
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ ...box, background: '#EFEAE2', fontFamily: body }}>
        <div className="flex items-center gap-[3cqi] px-[4cqi] py-[3.5cqi] text-white" style={{ background: design.palette.primary }}>
          <span className="size-[9cqi] shrink-0 rounded-full" style={{ background: photo }} />
          <span className="min-w-0">
            <span className="block truncate text-[5cqi] font-semibold leading-tight">
              {names[0]} &amp; {names[1]}
            </span>
            <span className="block text-[3.4cqi] opacity-80">typing…</span>
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-[2.5cqi] p-[4cqi] text-[4.2cqi] leading-snug text-[#111B21]">
          <span className="self-start rounded-[3cqi] rounded-tl-none bg-white px-[3cqi] py-[2cqi]">Hi! 👋 We have some news…</span>
          <span className="self-start rounded-[3cqi] rounded-tl-none bg-white p-[1.5cqi]">
            <span className="block h-[34cqi] w-[52cqi] rounded-[2cqi]" style={{ background: photo }} />
          </span>
          <span className="self-end rounded-[3cqi] rounded-tr-none bg-[#D9FDD3] px-[3cqi] py-[2cqi]">Omg!! 😍 When?</span>
          <span className="self-start rounded-[3cqi] rounded-tl-none bg-white px-[3cqi] py-[2cqi]">
            <b className="block text-[3.4cqi] uppercase" style={{ color: design.palette.primary }}>📅 Wedding</b>
            Sat, 14 Dec · 7 pm
          </span>
          <span className="mt-auto self-end rounded-full border bg-white px-[3.5cqi] py-[1.8cqi] font-semibold" style={{ borderColor: design.palette.primary, color: design.palette.primary }}>
            Yes, I&apos;ll be there 🎉
          </span>
        </div>
      </div>
    );

  if (design.layout === 'stories')
    return (
      <div className="absolute inset-0 overflow-hidden text-white" style={{ ...box, background: 'linear-gradient(160deg, #F58529 0%, #DD2A7B 55%, #8134AF 100%)', fontFamily: body }}>
        <div className="absolute inset-x-[2.5cqi] top-[2.5cqi] flex gap-[1cqi]">
          {[1, 0.6, 0, 0, 0].map((f, i) => (
            <span key={i} className="h-[0.8cqi] flex-1 overflow-hidden rounded-full bg-white/35">
              <span className="block h-full bg-white" style={{ width: `${f * 100}%` }} />
            </span>
          ))}
        </div>
        <div className="absolute left-[3cqi] top-[6cqi] flex items-center gap-[2cqi] text-[3.6cqi] font-semibold">
          <span className="size-[8cqi] rounded-full border-[0.6cqi] border-white" style={{ background: photo }} /> @{names[0].toLowerCase()}.{names[1].toLowerCase()}
        </div>
        <div className="absolute inset-x-0 bottom-[16%] flex flex-col items-center text-center">
          <span className="-rotate-3 rounded-[2cqi] bg-white px-[3cqi] py-[1.5cqi] text-[3.8cqi] font-bold uppercase tracking-wider text-[#111]">✨ Save the date</span>
          <span className="mt-[3cqi] text-[15cqi] leading-[1.02]" style={{ fontFamily: script }}>
            {names[0]}
            <br />&amp; {names[1]}
          </span>
          <span className="mt-[3cqi] rotate-2 rounded-[2cqi] bg-white px-[3cqi] py-[1.5cqi] text-[4cqi] font-semibold text-[#111]">📅 14 December</span>
        </div>
      </div>
    );

  if (design.layout === 'movie')
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ ...box, background: 'radial-gradient(120% 70% at 70% 20%, #5A1418 0%, #0B0B0F 70%)', color: '#F4F1EA', fontFamily: body }}>
        <div className="absolute inset-x-0 bottom-0 flex flex-col px-[6cqi] pb-[12cqi]">
          <span className="text-[3.4cqi] font-bold uppercase tracking-[0.3em]" style={{ color: design.palette.primary }}>
            ▌A family original
          </span>
          <span className="mt-[2cqi] text-[19cqi] uppercase leading-[0.88]" style={{ fontFamily: serif }}>
            {names[0]}
            <span className="block py-[1cqi] text-[8cqi] normal-case leading-none" style={{ fontFamily: script, color: design.palette.accent }}>
              weds
            </span>
            {names[1]}
          </span>
          <span className="mt-[3cqi] flex items-center gap-[2cqi] text-[3.6cqi]">
            <b className="text-[#46D369]">100% Match</b> 2026 <span className="border border-white/50 px-[1cqi] text-[3cqi]">U</span> 4 Episodes
          </span>
          <span className="mt-[4cqi] flex gap-[2.5cqi] text-[4.2cqi] font-bold">
            <span className="rounded-[1.5cqi] bg-white px-[4cqi] py-[2cqi] text-black">▶ Play</span>
            <span className="rounded-[1.5cqi] bg-white/20 px-[4cqi] py-[2cqi]">+ RSVP</span>
          </span>
        </div>
      </div>
    );

  if (design.layout === 'boarding')
    return (
      <div className="absolute inset-0 flex flex-col items-center overflow-hidden" style={{ ...box, background: 'linear-gradient(180deg, #6fb2e6, #b9dcf6 60%, #EEF3F9)', fontFamily: body, color: '#18223A' }}>
        <span className="mt-[7cqi] text-[3.4cqi] font-semibold uppercase tracking-[0.3em] text-white">✈ Celebration Airways</span>
        <span className="mt-[4cqi] block h-[46cqi] w-[38cqi] rounded-[46%/36%] border-[3cqi] border-[#f4f6fa]" style={{ background: photo }} />
        <span className="mt-[6cqi] w-[84%] overflow-hidden rounded-[3cqi] bg-white">
          <span className="block px-[4cqi] py-[2cqi] text-[3cqi] font-bold uppercase tracking-widest text-white" style={{ background: design.palette.primary }}>Boarding pass</span>
          <span className="flex items-center justify-between px-[4cqi] pt-[3cqi] text-[9cqi] font-bold leading-none">
            HOM <span className="text-[5cqi]" style={{ color: design.palette.primary }}>✈</span> WED
          </span>
          <span className="block px-[4cqi] pb-[3cqi] pt-[2cqi] text-center text-[7cqi]" style={{ fontFamily: script, color: design.palette.primary }}>
            {names[0]} &amp; {names[1]}
          </span>
          <span className="block h-[7cqi] border-t-[0.6cqi] border-dashed border-black/15 bg-[repeating-linear-gradient(90deg,#000_0_0.6cqi,transparent_0.6cqi_1.4cqi)] bg-[length:60%_60%] bg-center bg-no-repeat" />
        </span>
      </div>
    );

  if (design.layout === 'newspaper')
    return (
      <div className="absolute inset-0 overflow-hidden px-[5cqi] pt-[5cqi]" style={{ ...box, background: '#F1ECE1', fontFamily: body, color: '#1B1B1B' }}>
        <span className="block text-center text-[9.5cqi] font-black leading-none" style={{ fontFamily: serif }}>The Celebration Times</span>
        <span className="mt-[2cqi] block border-y-[0.5cqi] border-current py-[1cqi] text-center text-[2.6cqi] uppercase tracking-widest">Special edition · Price: your presence</span>
        <span className="mt-[4cqi] block text-center text-[9cqi] font-bold uppercase leading-[0.95]" style={{ fontFamily: serif }}>
          {names[0]} &amp; {names[1]}: wedding announced!
        </span>
        <span className="mt-[4cqi] block aspect-[16/10] w-full grayscale" style={{ background: photo }} />
        <span className="mt-[3cqi] grid grid-cols-2 gap-[3cqi]">
          {[0, 1].map((i) => (
            <span key={i} className="block h-[30cqi] bg-[repeating-linear-gradient(#1b1b1b33_0_0.5cqi,transparent_0.5cqi_2cqi)]" />
          ))}
        </span>
      </div>
    );

  if (design.layout === 'playlist')
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden px-[7cqi] pt-[8cqi] text-white" style={{ ...box, background: 'linear-gradient(180deg, #7a2a46, #121212 65%)', fontFamily: body }}>
        <span className="text-[3cqi] uppercase tracking-[0.2em] opacity-80">Now playing</span>
        <span className="mt-[5cqi] block aspect-square w-full rounded-[2cqi]" style={{ background: photo }} />
        <span className="mt-[5cqi] text-[6.5cqi] font-bold leading-tight">Our celebration mix</span>
        <span className="text-[4cqi] opacity-75">
          {names[0]} &amp; {names[1]}
        </span>
        <span className="mt-[4cqi] block h-[0.8cqi] rounded-full bg-white/25">
          <span className="block h-full w-[62%] rounded-full bg-white" />
        </span>
        <span className="mt-[4cqi] flex items-center justify-between text-[6cqi]">
          ⇄ ⏮ <span className="grid size-[14cqi] place-items-center rounded-full bg-white text-[6cqi] text-black">▶</span> ⏭ ☰
        </span>
      </div>
    );

  if (design.layout === 'arcade')
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[5cqi] overflow-hidden text-center" style={{ ...box, background: '#0A0820', color: '#F2F2FF', fontFamily: '"Press Start 2P", monospace', backgroundImage: 'radial-gradient(#fff 1px, transparent 1.5px)', backgroundSize: '10cqi 10cqi' }}>
        <span className="flex gap-[6cqi]">
          {[0, 1].map((i) => (
            <span key={i} className="block size-[22cqi]" style={{ background: photo, boxShadow: '0 0 0 1cqi #FFD84A, 0 0 0 2cqi #E8336D' }} />
          ))}
        </span>
        <span className="px-[6cqi] text-[5.4cqi] leading-[1.5] text-[#FFD84A]" style={{ textShadow: '1cqi 1cqi 0 #E8336D' }}>
          {names[0]} &amp; {names[1]}
        </span>
        <span className="text-[3.4cqi]">▶ PRESS START</span>
        <span className="text-[2.6cqi] text-[#7CF9FF]">HI-SCORE 00040 ♥♥♥</span>
      </div>
    );

  if (design.layout === 'menu')
    return (
      <div className="absolute inset-0 overflow-hidden p-[6cqi]" style={{ ...box, background: '#5E1A2B' }}>
        <div className="flex size-full flex-col items-center px-[5cqi] pt-[6cqi] text-center" style={{ background: '#F7F1E6', color: '#2B1D16', border: '1cqi double #C9A45C', fontFamily: body }}>
          <span className="text-[3cqi] uppercase tracking-[0.5em]" style={{ color: design.palette.primary }}>Menu</span>
          <span className="mt-[2cqi] text-[10cqi] leading-tight" style={{ fontFamily: script, color: design.palette.primary }}>
            {names[0]} &amp; {names[1]}
          </span>
          <span className="mt-[3cqi] block h-[26cqi] w-[22cqi] rounded-[50%]" style={{ background: photo, border: '0.8cqi double #C9A45C' }} />
          {['Mehendi', 'Sangeet', 'Wedding'].map((c, i) => (
            <span key={c} className="mt-[3cqi] block">
              <span className="block text-[2.6cqi] uppercase tracking-[0.3em] opacity-60">Course {['I', 'II', 'III'][i]}</span>
              <span className="block text-[6cqi] leading-none" style={{ fontFamily: script, color: design.palette.primary }}>
                {c}
              </span>
            </span>
          ))}
        </div>
      </div>
    );

  if (design.layout === 'calendar')
    return (
      <div className="absolute inset-0 flex flex-col items-center overflow-hidden px-[7cqi] pt-[8cqi]" style={{ ...box, background: '#FBF7F0', fontFamily: body, color: '#2A2A2A' }}>
        <span className="w-full overflow-hidden rounded-[3cqi] bg-white shadow-md">
          <span className="block aspect-[4/3]" style={{ background: photo }} />
          <span className="block px-[4cqi] py-[2cqi] text-[6cqi] text-white" style={{ background: design.palette.primary, fontFamily: serif }}>
            December 2026
          </span>
          <span className="grid grid-cols-7 gap-[1cqi] p-[3cqi] text-center text-[3.4cqi]">
            {Array.from({ length: 21 }, (_, i) => (
              <span key={i} className={i === 13 ? 'rounded-full font-bold' : ''} style={i === 13 ? { boxShadow: `0 0 0 0.6cqi ${design.palette.primary}`, color: design.palette.primary } : undefined}>
                {i + 1}
              </span>
            ))}
          </span>
        </span>
        <span className="-mt-[3cqi] w-[72%] rotate-[-3deg] bg-[#FFE680] p-[3cqi] text-[6cqi] leading-tight" style={{ fontFamily: script }}>
          Mark your calendar ♡
        </span>
      </div>
    );

  // Scrapbook: magazine cover over kraft paper.
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ ...box, background: '#EFE3CF', fontFamily: body, color: '#2B2622' }}>
      <div className="absolute inset-x-[5cqi] top-[5cqi] h-[64%] overflow-hidden" style={{ background: photo }}>
        <span className="absolute left-[3cqi] top-[1cqi] text-[17cqi] leading-none" style={{ fontFamily: serif, color: design.palette.accent }}>
          WEDDING
        </span>
        <span className="absolute bottom-[4cqi] left-[3cqi] right-[3cqi] text-white">
          <span className="bg-[#B8402B] px-[1.5cqi] text-[2.8cqi] font-bold uppercase tracking-widest">Exclusive</span>
          <span className="mt-[1cqi] block text-[8cqi] leading-[0.95]" style={{ fontFamily: serif }}>
            {names[0]} &amp; {names[1]}
          </span>
        </span>
      </div>
      <div className="absolute bottom-[4cqi] left-[10cqi] w-[38cqi] rotate-[-5deg] bg-[#FFFDF8] p-[2cqi] pb-[7cqi] shadow-md">
        <span className="block aspect-square" style={{ background: photo }} />
        <span className="absolute inset-x-0 bottom-[1cqi] text-center text-[5cqi]" style={{ fontFamily: script }}>
          us ♡
        </span>
      </div>
      <span className="absolute bottom-[14cqi] right-[8cqi] h-[5cqi] w-[18cqi] rotate-12 bg-[#F3C5C5]/90" />
      <span className="absolute bottom-[6cqi] right-[6cqi] w-[40cqi] rotate-3 bg-[#FFFDF3] p-[2.5cqi] text-[5.5cqi] leading-tight shadow-md" style={{ fontFamily: script, color: '#B8402B' }}>
        Mehendi · Sat
      </span>
    </div>
  );
}
