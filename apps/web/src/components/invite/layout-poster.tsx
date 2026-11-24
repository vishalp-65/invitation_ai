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
