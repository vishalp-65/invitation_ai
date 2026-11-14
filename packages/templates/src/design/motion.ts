import { DESIGN_H, DESIGN_W, type DesignElement } from '@cardai/shared';
import { ASSETS } from './assets';

export interface Motion {
  transform: string;
  opacity: number;
  filter?: string;
  origin?: string;
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (x: number) => 1 - (1 - x) ** 3;
/** Soft spring overshoot (Apple-like), settles at 1. */
const spring = (x: number) => (x >= 1 ? 1 : 1 - Math.exp(-6 * x) * Math.cos(9 * x));

const isBackdrop = (el: DesignElement) => el.w >= DESIGN_W * 0.9 && el.h >= DESIGN_H * 0.7;

/** Seconds after the scene starts that an element begins its entrance. */
export function entranceDelay(el: DesignElement): number {
  if (isBackdrop(el)) return 0;
  // Top-to-bottom reading order, so the card "writes itself" as the viewer reads.
  const cy = (el.y + el.h / 2) / DESIGN_H;
  return 0.25 + clamp(cy) * 2.1;
}

/** Entrance + gentle idle motion for one layer at time t (seconds into its page scene). */
export function elementMotion(el: DesignElement, _index: number, t: number): Motion {
  const anim = el.anim ?? 'auto';
  if (anim === 'none') return { transform: '', opacity: 1 };
  const delay = entranceDelay(el);
  const dur = isBackdrop(el) ? 0.9 : 0.85;
  const p = clamp((t - delay) / dur);
  const e = easeOut(p);

  let kind = anim;
  if (kind === 'auto') {
    if (isBackdrop(el)) kind = 'fade';
    else if (el.type === 'text') kind = 'rise';
    else if (el.type === 'image') kind = 'zoom';
    else kind = 'zoom';
  }

  let transform = '';
  let filter: string | undefined;
  switch (kind) {
    case 'rise':
      transform = `translateY(${(1 - e) * 46}px)`;
      filter = p < 1 ? `blur(${(1 - e) * 10}px)` : undefined;
      break;
    case 'zoom':
      transform = `scale(${0.82 + 0.18 * spring(p)})`;
      break;
    case 'drop':
      transform = `translateY(${(1 - spring(p)) * -90}px)`;
      break;
    case 'fade':
    default:
      break;
  }

  // Idle motion once in place.
  if (el.type === 'art' && p >= 1) {
    const m = ASSETS[el.asset]?.motion;
    const local = t - delay - dur;
    const amp = Math.min(1, local / 0.8);
    if (m === 'sway') return { transform: `${transform} rotate(${Math.sin(local * 1.5) * 1.6 * amp}deg)`, opacity: 1, origin: 'top center' };
    if (m === 'float') return { transform: `${transform} translateY(${Math.sin(local * 1.3) * 7 * amp}px)`, opacity: 1 };
    if (m === 'twinkle') return { transform, opacity: 0.75 + 0.25 * Math.sin(local * 2.2) };
    if (m === 'flicker') return { transform: `${transform} scale(${1 + 0.012 * Math.sin(local * 11)})`, opacity: 1 };
  }
  return { transform, opacity: e, filter };
}
