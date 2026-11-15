'use client';

import { siteCharacterFor, type SiteDoc } from '@cardai/shared';
import { BabyMoon, Cake, Couple, DiyaArt, Doves, Elephant, Ganesha, House, Kalash, Peacock } from '@cardai/templates/art';

/**
 * Animated SVG characters. The art is the same hand-drawn vector set used on cards and videos;
 * here it enters with the hero and keeps a gentle idle motion (float / sway).
 */
export function Character({
  doc,
  eventType,
  community,
  primary,
  accent,
  size,
}: {
  doc: SiteDoc;
  eventType: string;
  /** The family's tradition: "auto" never shows another faith's sacred character. */
  community?: string | null;
  primary: string;
  accent: string;
  size: number;
}) {
  const kind = siteCharacterFor(doc.character.kind, eventType, community);
  if (kind === 'none') return null;
  const box = { w: size, h: size };
  let art: React.ReactNode;
  let idle = 'inv-float';
  switch (kind) {
    case 'couple':
      art = <Couple style={doc.character.style} attire={doc.character.attire} ink={primary} wash={accent} size={size} />;
      idle = 'inv-sway';
      break;
    case 'ganesha':
      art = <Ganesha color={primary} glow={accent} size={size} />;
      break;
    case 'diya':
      art = <DiyaArt size={size} gold={primary} flicker={0} />;
      break;
    case 'kalash':
      art = <Kalash {...box} c={[primary, '#2F7D32', accent]} />;
      break;
    case 'baby':
      art = <BabyMoon {...box} c={['#F8D57E', primary, '#FFFFFF']} />;
      break;
    case 'cake':
      art = <Cake {...box} c={['#FFF4E6', accent, primary]} />;
      break;
    case 'elephant':
      art = <Elephant {...box} c={['#7E8796', accent, primary]} />;
      idle = 'inv-sway';
      break;
    case 'peacock':
      art = <Peacock {...box} c={['#1B4F9C', '#2E8B57', primary]} />;
      idle = 'inv-sway';
      break;
    case 'doves':
      art = <Doves {...box} c={['#FFFFFF', primary]} />;
      break;
    case 'house':
      art = <House {...box} c={['#FFF6E5', accent, primary]} />;
      break;
  }
  return (
    <div className={`${idle} flex justify-center`} aria-hidden>
      {art}
    </div>
  );
}
