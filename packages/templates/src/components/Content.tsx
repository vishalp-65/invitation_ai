import type { InviteFunction, InviteProps } from '@cardai/shared';
import type { CSSProperties, ReactNode } from 'react';
import { Img } from 'remotion';
import type { Skin } from '../layouts/skin';
import { isDark } from '../utils/color';
import { Couple } from '../art/Couple';
import { DiyaArt } from '../art/Diya';
import { Ganesha } from '../art/Ganesha';
import { Motif } from './Motif';

/** Per-line animation hook used by video scenes. Cards pass nothing (static). */
export type LineAnim = (index: number) => CSSProperties;

interface BlockProps {
  props: InviteProps;
  skin: Skin;
  /** 1% of canvas width — all sizes are relative so one layout fits every canvas. */
  u: number;
  anim?: LineAnim;
}

const noAnim: LineAnim = () => ({});

/** Shrinks long strings so names never overflow. */
export function fitSize(base: number, text: string, comfortable: number): number {
  const len = [...text].length;
  return len <= comfortable ? base : Math.max(base * 0.55, (base * comfortable) / len);
}

/** First grapheme of each name — correct for conjuncts like "प्रि" in Devanagari. */
export function initialsOf(names: string[]): string[] {
  const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return names
    .filter(Boolean)
    .map((n) => seg.segment(n.trim()).containing(0)?.segment.toUpperCase() ?? '')
    .filter(Boolean);
}

/** Large initials seal used by the monogram layout. */
export function MonogramSeal({ names, skin, u }: { names: string[]; skin: Skin; u: number }) {
  const initials = initialsOf(names);
  if (!initials.length) return null;
  const size = 30 * u;
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'grid', placeItems: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0 }} aria-hidden>
        <circle cx={50} cy={50} r={48} fill="none" stroke={skin.accent} strokeWidth={0.8} />
        <circle cx={50} cy={50} r={44} fill="none" stroke={skin.accent} strokeWidth={0.3} />
        <path d="M50 2 v6 M50 92 v6 M2 50 h6 M92 50 h6" stroke={skin.accent} strokeWidth={0.8} />
      </svg>
      <div style={{ fontFamily: skin.display, fontSize: initials.length > 1 ? 10 * u : 14 * u, color: skin.ink, letterSpacing: '0.04em', lineHeight: 1 }}>
        {initials.join(initials.length > 1 ? '·' : '')}
      </div>
    </div>
  );
}

/** Arch-shaped hero photo (falls back to a monogram when no photo is uploaded). */
export function PhotoArch({ photo, names, skin, u }: { photo?: string; names: string[]; skin: Skin; u: number }) {
  const w = 50 * u;
  const h = 62 * u;
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: `${w / 2}px ${w / 2}px ${2 * u}px ${2 * u}px`,
        overflow: 'hidden',
        border: `${0.6 * u}px solid ${skin.accent}`,
        boxShadow: `0 ${1.5 * u}px ${5 * u}px rgba(0,0,0,0.25)`,
        display: 'grid',
        placeItems: 'center',
        background: `linear-gradient(160deg, ${skin.accent}33, ${skin.accent}11)`,
      }}
    >
      {photo ? <Img src={photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <MonogramSeal names={names} skin={skin} u={u} />}
    </div>
  );
}

export function Divider({ color, width }: { color: string; width: number }) {
  const h = width * 0.08;
  return (
    <svg width={width} height={h} viewBox="0 0 100 8" aria-hidden>
      <path d="M2 4 H40 M60 4 H98" stroke={color} strokeWidth={0.6} />
      <path d="M50 0.5 L54 4 L50 7.5 L46 4Z" fill={color} />
      <circle cx={42} cy={4} r={1} fill={color} />
      <circle cx={58} cy={4} r={1} fill={color} />
    </svg>
  );
}

function Line({ children, style, i, anim }: { children: ReactNode; style: CSSProperties; i: number; anim: LineAnim }) {
  if (children === undefined || children === null || children === '') return null;
  return <div style={{ ...style, ...anim(i) }}>{children}</div>;
}

/** The hero illustration chosen by the template's decor (or the classic motif). */
export function HeroArt({ props, skin, u, scale = 1 }: { props: InviteProps; skin: Skin; u: number; scale?: number }) {
  const theme = props.template.theme;
  const names = props.content.primaryNames.filter(Boolean);
  const d = skin.decor;
  if (d.art === 'couple') {
    return <Couple style={d.coupleStyle} attire={d.attire} ink={skin.accent} wash={theme.palette.accent} size={44 * u * scale} />;
  }
  // Gold reads as gold on dark grounds; on cream/ivory a deeper antique gold keeps contrast.
  const gold = isDark(skin.textBg) ? theme.palette.primary : '#A8741A';
  if (d.art === 'ganesha') return <Ganesha color={gold} glow={theme.palette.accent} size={24 * u * scale} light={!isDark(skin.textBg)} />;
  if (d.art === 'diya') return <DiyaArt size={40 * u * scale} gold={gold} />;
  if (skin.layout === 'photo-frame') return <PhotoArch photo={props.photos[0]} names={names} skin={skin} u={u * scale} />;
  if (skin.layout === 'monogram') return <MonogramSeal names={names} skin={skin} u={u * scale} />;
  return <Motif motif={theme.motif} color={skin.accent} accent={theme.palette.accent} size={13 * u * scale} />;
}

/** Classic invitation date strip:  WEEKDAY │ 11 December 2026 │ 8:00 PM */
export function DateStrip({ fn, skin, u, k = 1 }: { fn: InviteFunction; skin: Skin; u: number; k?: number }) {
  const rule: CSSProperties = { width: 0.25 * u, alignSelf: 'stretch', background: skin.accent, opacity: 0.8 };
  const side: CSSProperties = {
    fontFamily: skin.body,
    fontSize: 2.8 * u * k,
    color: skin.ink,
    letterSpacing: skin.headingTransform === 'uppercase' ? '0.18em' : '0.04em',
    textTransform: skin.headingTransform,
    width: 22 * u * k,
    fontWeight: 600,
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.2 * u * k }}>
      <div style={{ fontFamily: skin.display, fontSize: 4 * u * k, color: skin.accent, letterSpacing: skin.headingSpacing, textTransform: skin.headingTransform }}>
        {fn.name}
      </div>
      <div style={{ borderTop: `${0.25 * u}px solid ${skin.accent}`, borderBottom: `${0.25 * u}px solid ${skin.accent}`, padding: `${1.2 * u * k}px 0`, display: 'flex', alignItems: 'center', gap: 2.4 * u * k }}>
        <div style={side}>{fn.parts.weekday}</div>
        <div style={rule} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
          <span style={{ fontFamily: skin.display, fontSize: 9 * u * k, color: skin.accent }}>{fn.parts.day}</span>
          <span style={{ fontFamily: skin.body, fontSize: 2.6 * u * k, color: skin.ink, marginTop: 0.6 * u }}>
            {fn.parts.month} {fn.parts.year}
          </span>
        </div>
        <div style={rule} />
        <div style={side}>{fn.timeLabel}</div>
      </div>
    </div>
  );
}

export function VenueBlock({ fn, skin, u, k = 1 }: { fn: InviteFunction; skin: Skin; u: number; k?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.4 * u }}>
      <svg width={3.4 * u * k} height={3.4 * u * k} viewBox="0 0 24 24" aria-hidden>
        <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" fill="none" stroke={skin.accent} strokeWidth={1.8} />
        <circle cx={12} cy={10} r={2.6} fill={skin.accent} />
      </svg>
      <div style={{ fontFamily: skin.body, fontSize: 3.4 * u * k, color: skin.ink, fontWeight: 700, lineHeight: 1.25 }}>{fn.venue}</div>
      {fn.address && <div style={{ fontFamily: skin.body, fontSize: 2.6 * u * k, color: skin.muted, maxWidth: 66 * u, lineHeight: 1.35 }}>{fn.address}</div>}
    </div>
  );
}

export function NamesBlock({ props, skin, u, anim = noAnim, start = 0 }: BlockProps & { start?: number }) {
  const c = props.content;
  const names = c.primaryNames.filter(Boolean);
  if (!names.length) return null;
  const script = skin.names !== skin.display;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.4 * u, ...anim(start) }}>
      <NameLine name={names[0]!} detail={c.primaryDetails[0]} skin={skin} u={u} single={names.length === 1} />
      {names.length === 2 && (
        <>
          <div style={{ fontFamily: script ? skin.names : skin.display, fontStyle: script ? 'normal' : 'italic', fontSize: (script ? 6 : 4.2) * u, color: skin.accent, lineHeight: 1 }}>
            {c.connector || '&'}
          </div>
          <NameLine name={names[1]!} detail={c.primaryDetails[1]} skin={skin} u={u} single={false} />
        </>
      )}
    </div>
  );
}

/**
 * Page 1: a complete invitation on its own — blessing, hosts, names with parentage,
 * the main function's date strip and venue (and the family when space allows).
 */
export function CoverBlock({ props, skin, u, anim = noAnim, inlineFunction, showFamily }: BlockProps & { inlineFunction?: boolean; showFamily?: boolean }) {
  const c = props.content;
  const heading: CSSProperties = {
    fontFamily: skin.display,
    color: skin.accent,
    textTransform: skin.headingTransform,
    letterSpacing: skin.headingSpacing,
  };
  const fn = inlineFunction ? props.functions[props.mainFunction] ?? props.functions[0] : undefined;
  const bigArt = skin.decor.art === 'couple';

  return (
    <>
      <Line i={0} anim={anim} style={{ fontFamily: skin.body, fontStyle: 'italic', fontSize: 3 * u, color: skin.muted }}>
        {props.salutation}
      </Line>
      {skin.decor.art !== 'couple' && (
        <div style={anim(1)}>
          <HeroArt props={props} skin={skin} u={u} />
        </div>
      )}
      <Line i={2} anim={anim} style={{ fontFamily: skin.body, fontSize: 3.2 * u, color: skin.accent, letterSpacing: '0.04em' }}>
        {c.invocation}
      </Line>
      {bigArt && (
        <div style={{ ...anim(1), marginTop: -1 * u, marginBottom: -2 * u }}>
          <HeroArt props={props} skin={skin} u={u} />
        </div>
      )}
      <Line i={3} anim={anim} style={{ ...heading, fontSize: 7 * u, lineHeight: 1.15 }}>
        {c.headline}
      </Line>
      <Line i={4} anim={anim} style={{ fontFamily: skin.body, fontSize: 3.1 * u, color: skin.ink, lineHeight: 1.45, maxWidth: '92%' }}>
        {c.hostLine}
      </Line>

      <NamesBlock props={props} skin={skin} u={u} anim={anim} start={5} />

      {!fn && (
        <div style={anim(6)}>
          <Divider color={skin.accent} width={40 * u} />
        </div>
      )}
      {(!fn || !bigArt) && (
        <Line i={7} anim={anim} style={{ fontFamily: skin.body, fontSize: 2.9 * u, color: skin.ink, lineHeight: 1.5, maxWidth: '90%' }}>
          {c.message}
        </Line>
      )}
      {fn && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 * u, marginTop: 0.8 * u, ...anim(8) }}>
          <DateStrip fn={fn} skin={skin} u={u} />
          <VenueBlock fn={fn} skin={skin} u={u} />
        </div>
      )}
      {showFamily && c.familyLines.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 * u, ...anim(9) }}>
          {c.familyTitle && <div style={{ fontFamily: skin.display, fontSize: 3.4 * u, color: skin.accent }}>{c.familyTitle}</div>}
          <div style={{ fontFamily: skin.body, fontSize: 2.6 * u, color: skin.ink, lineHeight: 1.45 }}>{c.familyLines.join('  •  ')}</div>
        </div>
      )}
      {props.photos[0] && !fn && skin.layout !== 'photo-frame' && skin.decor.art === 'none' && (
        <div style={anim(8)}>
          <Img src={props.photos[0]} style={{ width: 34 * u, height: 34 * u, objectFit: 'cover', borderRadius: '50%', border: `${0.6 * u}px solid ${skin.accent}` }} />
        </div>
      )}
    </>
  );
}

function NameLine({ name, detail, skin, u, single }: { name: string; detail?: string; skin: Skin; u: number; single: boolean }) {
  const script = skin.names !== skin.display;
  const base = (single ? 11 : 9.5) * u * (script ? 1.25 : 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontFamily: skin.names, fontSize: fitSize(base, name, script ? 14 : 12), color: skin.ink, lineHeight: script ? 1.25 : 1.1, fontWeight: script ? 400 : 600 }}>
        {name}
      </div>
      {detail && <div style={{ fontFamily: skin.body, fontSize: 2.5 * u, color: skin.muted, marginTop: 0.2 * u, fontStyle: 'italic' }}>{detail}</div>}
    </div>
  );
}

export function FunctionCard({ fn, skin, u, compact = false, large = false }: { fn: InviteFunction; skin: Skin; u: number; compact?: boolean; large?: boolean }) {
  const k = large ? 1.35 : compact ? 0.85 : 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 * u * k }}>
      <div style={{ fontFamily: skin.display, fontSize: 5.2 * u * k, color: skin.accent, letterSpacing: skin.headingSpacing, textTransform: skin.headingTransform }}>
        {fn.name}
      </div>
      <div style={{ fontFamily: skin.body, fontSize: 3.2 * u * k, color: skin.ink, fontWeight: 600 }}>{fn.dateLabel}</div>
      <div style={{ fontFamily: skin.body, fontSize: 3 * u * k, color: skin.ink }}>{fn.timeLabel}</div>
      <div style={{ fontFamily: skin.body, fontSize: 3.2 * u * k, color: skin.ink, fontWeight: 600, marginTop: 0.4 * u }}>{fn.venue}</div>
      {fn.address && (
        <div style={{ fontFamily: skin.body, fontSize: 2.5 * u * k, color: skin.muted, maxWidth: 70 * u, lineHeight: 1.35 }}>
          {fn.address}
        </div>
      )}
      {fn.dressCode && (
        <div style={{ fontFamily: skin.body, fontStyle: 'italic', fontSize: 2.4 * u * k, color: skin.muted }}>{fn.dressCode}</div>
      )}
    </div>
  );
}

export function FunctionsBlock({ props, skin, u, anim = noAnim, items }: BlockProps & { items: number[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3.5 * u }}>
      {items.map((idx, i) => {
        const fn = props.functions[idx];
        if (!fn) return null;
        return (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5 * u, ...anim(i) }}>
            <FunctionCard fn={fn} skin={skin} u={u} large={items.length === 1} />
            {i < items.length - 1 && <Divider color={skin.accent} width={26 * u} />}
          </div>
        );
      })}
    </div>
  );
}

export function FamilyBlock({ props, skin, u, anim = noAnim, showLink = true }: BlockProps & { showLink?: boolean }) {
  const c = props.content;
  return (
    <>
      <Line i={0} anim={anim} style={{ fontFamily: skin.display, fontSize: 5.6 * u, color: skin.accent, textTransform: skin.headingTransform, letterSpacing: skin.headingSpacing }}>
        {c.familyTitle}
      </Line>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1.1 * u, alignItems: 'center', ...anim(1) }}>
        {c.familyLines.map((line, i) => (
          <div key={i} style={{ fontFamily: skin.body, fontSize: fitSize(3.1 * u, line, 38), color: skin.ink }}>
            {line}
          </div>
        ))}
      </div>
      <div style={anim(2)}>
        <Divider color={skin.accent} width={36 * u} />
      </div>
      <Line i={3} anim={anim} style={{ fontFamily: skin.display, fontStyle: 'italic', fontSize: 3.6 * u, color: skin.ink, maxWidth: '88%', lineHeight: 1.4 }}>
        {c.closing}
      </Line>
      {showLink && (props.qrDataUrl || props.siteUrl) && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 * u, ...anim(4) }}>
          {props.qrDataUrl && (
            <Img src={props.qrDataUrl} style={{ width: 18 * u, height: 18 * u, background: '#fff', padding: 0.8 * u, borderRadius: u }} />
          )}
          {props.siteUrl && (
            <div style={{ fontFamily: skin.body, fontSize: 2.4 * u, color: skin.muted }}>{props.siteUrl.replace(/^https?:\/\//, '')}</div>
          )}
        </div>
      )}
    </>
  );
}
