import type { LayoutId, Theme } from '@cardai/shared';
import { AbsoluteFill } from '../utils/remotion-lite';

interface FrameProps {
  layout: LayoutId;
  theme: Theme;
  width: number;
  height: number;
}

/** Decorative border that gives each layout family its identity. */
export function Frame({ layout, theme, width: w, height: h }: FrameProps) {
  const { primary: c, accent: a } = theme.palette;
  const sw = w * 0.004;

  const content = (() => {
    switch (layout) {
      case 'royal-arch': {
        const x0 = w * 0.06;
        const x1 = w * 0.94;
        const yTop = h * 0.035;
        const shoulder = h * 0.16;
        const yb = h * 0.965;
        const arch = (inset: number) =>
          `M${x0 + inset} ${yb - inset} L${x0 + inset} ${shoulder + inset}
           C${x0 + inset} ${shoulder * 0.55 + inset} ${w * 0.3} ${yTop + inset + h * 0.02} ${w / 2} ${yTop + inset}
           C${w * 0.7} ${yTop + inset + h * 0.02} ${x1 - inset} ${shoulder * 0.55 + inset} ${x1 - inset} ${shoulder + inset}
           L${x1 - inset} ${yb - inset} Z`;
        return (
          <>
            <path d={arch(0)} fill="none" stroke={c} strokeWidth={sw * 2} />
            <path d={arch(w * 0.018)} fill="none" stroke={a} strokeWidth={sw} strokeDasharray={`${sw * 4} ${sw * 3}`} />
            <circle cx={w / 2} cy={yTop - h * 0.004} r={w * 0.016} fill={c} />
            {[0.18, 0.82].map((fx) => (
              <g key={fx}>
                <circle cx={w * fx} cy={yb - h * 0.04} r={w * 0.012} fill={a} />
                <path d={`M${w * fx} ${yb - h * 0.035} v${h * 0.03}`} stroke={c} strokeWidth={sw} />
              </g>
            ))}
          </>
        );
      }
      case 'floral-frame': {
        const corner = (key: string, transform: string) => (
          <g key={key} transform={transform}>
            <path d={`M0 ${h * 0.22} Q${w * 0.02} ${h * 0.05} ${w * 0.22} 0`} stroke={c} strokeWidth={sw * 1.5} fill="none" />
            {[
              [0.05, 0.12, 0.05],
              [0.12, 0.05, 0.04],
              [0.03, 0.2, 0.03],
              [0.2, 0.025, 0.03],
            ].map(([fx, fy, r], i) => (
              <g key={i}>
                {Array.from({ length: 6 }, (_, k) => (
                  <ellipse
                    key={k}
                    cx={w * fx!}
                    cy={h * fy! - w * r! * 0.55}
                    rx={w * r! * 0.32}
                    ry={w * r! * 0.55}
                    fill={k % 2 ? a : c}
                    fillOpacity={0.85}
                    transform={`rotate(${k * 60} ${w * fx!} ${h * fy!})`}
                  />
                ))}
                <circle cx={w * fx!} cy={h * fy!} r={w * r! * 0.25} fill={a} />
              </g>
            ))}
          </g>
        );
        return (
          <>
            {corner('tl', '')}
            {corner('tr', `translate(${w} 0) scale(-1 1)`)}
            {corner('bl', `translate(0 ${h}) scale(1 -1)`)}
            {corner('br', `translate(${w} ${h}) scale(-1 -1)`)}
          </>
        );
      }
      case 'minimal-modern': {
        const i1 = w * 0.05;
        const i2 = w * 0.065;
        return (
          <>
            <rect x={i1} y={i1} width={w - i1 * 2} height={h - i1 * 2} fill="none" stroke={c} strokeWidth={sw} />
            <rect x={i2} y={i2} width={w - i2 * 2} height={h - i2 * 2} fill="none" stroke={c} strokeWidth={sw * 0.5} strokeOpacity={0.6} />
          </>
        );
      }
      case 'temple-heritage': {
        const band = h * 0.06;
        const teeth = 14;
        const tw = w / teeth;
        const row = (y: number, flip: boolean) =>
          Array.from({ length: teeth }, (_, i) => {
            const x = i * tw;
            const tip = flip ? y - band * 0.55 : y + band * 0.55;
            return (
              <path key={`${y}-${i}`} d={`M${x} ${y} L${x + tw / 2} ${tip} L${x + tw} ${y}Z`} fill={i % 2 ? c : a} />
            );
          });
        return (
          <>
            <rect x={0} y={0} width={w} height={band * 0.45} fill={c} />
            {row(band * 0.45, false)}
            <rect x={0} y={h - band * 0.45} width={w} height={band * 0.45} fill={c} />
            {row(h - band * 0.45, true)}
            <path d={`M${w * 0.05} ${band} V${h - band} M${w * 0.95} ${band} V${h - band}`} stroke={c} strokeWidth={sw * 1.5} />
            <path d={`M${w * 0.065} ${band} V${h - band} M${w * 0.935} ${band} V${h - band}`} stroke={a} strokeWidth={sw * 0.6} />
          </>
        );
      }
      case 'photo-frame': {
        const i = w * 0.045;
        return (
          <>
            <rect x={i} y={i} width={w - i * 2} height={h - i * 2} rx={w * 0.03} fill="none" stroke={c} strokeWidth={sw} />
            <path d={`M${w * 0.42} ${h - i} h${w * 0.16}`} stroke={a} strokeWidth={sw * 3} strokeLinecap="round" />
          </>
        );
      }
      case 'botanical': {
        // Soft watercolour washes + leaf sprigs in two corners.
        const blob = (cx: number, cy: number, r: number, color: string, op: number, key: string) => (
          <circle key={key} cx={cx} cy={cy} r={r} fill={color} opacity={op} />
        );
        const sprig = (key: string, transform: string) => (
          <g key={key} transform={transform}>
            <path d={`M0 0 Q${w * 0.18} ${h * 0.05} ${w * 0.32} ${h * 0.02}`} stroke={c} strokeWidth={sw * 1.2} fill="none" />
            {Array.from({ length: 7 }, (_, k) => {
              const t = (k + 1) / 8;
              const x = w * 0.32 * t;
              const y = h * 0.035 * Math.sin(t * Math.PI);
              return (
                <ellipse key={k} cx={x} cy={y + (k % 2 ? -1 : 1) * w * 0.018} rx={w * 0.026} ry={w * 0.011} fill={k % 2 ? c : a} opacity={0.85} transform={`rotate(${k % 2 ? -35 : 35} ${x} ${y})`} />
              );
            })}
          </g>
        );
        return (
          <>
            {blob(w * 0.05, h * 0.06, w * 0.32, a, 0.22, 'b1')}
            {blob(w * 0.22, h * 0.02, w * 0.18, c, 0.12, 'b2')}
            {blob(w * 0.95, h * 0.95, w * 0.34, a, 0.2, 'b3')}
            {blob(w * 0.78, h * 0.99, w * 0.18, c, 0.12, 'b4')}
            {sprig('s1', `translate(${w * 0.06} ${h * 0.09}) rotate(8)`)}
            {sprig('s2', `translate(${w * 0.94} ${h * 0.91}) rotate(188)`)}
          </>
        );
      }
      case 'art-deco': {
        const cx = w / 2;
        const top = h * 0.04;
        const rays = Array.from({ length: 13 }, (_, k) => {
          const ang = Math.PI * (0.15 + (0.7 * k) / 12);
          return <path key={k} d={`M${cx} ${top + h * 0.1} L${cx - Math.cos(ang) * w * 0.32} ${top + h * 0.1 - Math.sin(ang) * h * 0.09}`} stroke={c} strokeWidth={sw * 0.8} />;
        });
        const i1 = w * 0.05;
        const i2 = w * 0.07;
        const step = w * 0.06;
        const corner = (x: number, y: number, sx: number, sy: number, key: string) => (
          <path key={key} d={`M${x} ${y + sy * step * 2} V${y + sy * step} H${x + sx * step} V${y} H${x + sx * step * 2}`} fill="none" stroke={a} strokeWidth={sw * 1.2} />
        );
        return (
          <>
            <rect x={i1} y={i1} width={w - i1 * 2} height={h - i1 * 2} fill="none" stroke={c} strokeWidth={sw * 1.5} />
            <rect x={i2} y={i2} width={w - i2 * 2} height={h - i2 * 2} fill="none" stroke={c} strokeWidth={sw * 0.5} />
            {rays}
            <circle cx={cx} cy={top + h * 0.1} r={w * 0.03} fill={c} />
            {corner(i2, i2, 1, 1, 'tl')}
            {corner(w - i2, i2, -1, 1, 'tr')}
            {corner(i2, h - i2, 1, -1, 'bl')}
            {corner(w - i2, h - i2, -1, -1, 'br')}
            <path d={`M${cx - w * 0.12} ${h - h * 0.07} L${cx} ${h - h * 0.055} L${cx + w * 0.12} ${h - h * 0.07}`} fill="none" stroke={c} strokeWidth={sw} />
          </>
        );
      }
      case 'monogram': {
        const i = w * 0.06;
        return (
          <>
            <rect x={i} y={i} width={w - i * 2} height={h - i * 2} fill="none" stroke={c} strokeWidth={sw * 0.6} />
            <path d={`M${w / 2 - w * 0.05} ${i} h${w * 0.1} M${w / 2 - w * 0.05} ${h - i} h${w * 0.1}`} stroke={theme.palette.background} strokeWidth={sw * 2} />
            <circle cx={w / 2} cy={i} r={w * 0.008} fill={c} />
            <circle cx={w / 2} cy={h - i} r={w * 0.008} fill={c} />
          </>
        );
      }
      case 'jharokha': {
        // Mughal cusped-arch window: a surface panel framed in double gold lines.
        const arch = (inset: number) => {
          const x0 = w * 0.08 + inset;
          const x1 = w * 0.92 - inset;
          const cx = w / 2;
          const yS = h * 0.24 + inset;
          const yTop = h * 0.055 + inset;
          const yB = h * 0.965 - inset;
          const span = x1 - x0;
          const L = [
            [x0, yS],
            [x0 + span * 0.05, yS - span * 0.13],
            [x0 + span * 0.15, yS - span * 0.24],
            [x0 + span * 0.29, yS - span * 0.31],
          ] as const;
          const R = L.map(([x, y]) => [w - x, y] as const).reverse();
          const arc = (from: readonly [number, number], to: readonly [number, number]) => {
            const d = Math.hypot(to[0] - from[0], to[1] - from[1]);
            return `A${d * 0.62} ${d * 0.62} 0 0 1 ${to[0]} ${to[1]}`;
          };
          let d = `M${x0} ${yB} L${L[0][0]} ${L[0][1]} `;
          for (let i = 0; i < L.length - 1; i++) d += arc(L[i]!, L[i + 1]!) + ' ';
          d += `Q${cx - span * 0.06} ${yTop + span * 0.02} ${cx} ${yTop} Q${cx + span * 0.06} ${yTop + span * 0.02} ${R[0]![0]} ${R[0]![1]} `;
          for (let i = 0; i < R.length - 1; i++) d += arc(R[i]!, R[i + 1]!) + ' ';
          d += `L${x1} ${yB} Z`;
          return d;
        };
        return (
          <>
            <path d={arch(0)} fill={theme.palette.surface} stroke={c} strokeWidth={sw * 2.2} />
            <path d={arch(w * 0.022)} fill="none" stroke={a} strokeWidth={sw * 0.8} />
            <path d={arch(w * 0.032)} fill="none" stroke={c} strokeWidth={sw * 0.4} strokeDasharray={`${sw * 2} ${sw * 3}`} />
            <path d={`M${w / 2} ${h * 0.03} l${w * 0.018} ${w * 0.03} l${-w * 0.018} ${w * 0.03} l${-w * 0.018} ${-w * 0.03} Z`} fill={c} />
            {[0.08, 0.92].map((fx) => (
              <rect key={fx} x={w * fx - w * 0.012} y={h * 0.24} width={w * 0.024} height={h * 0.725} fill={c} opacity={0.9} />
            ))}
          </>
        );
      }
      case 'festive-pop':
        return (
          <rect
            x={w * 0.04}
            y={w * 0.04}
            width={w * 0.92}
            height={h - w * 0.08}
            rx={w * 0.05}
            fill="none"
            stroke={a}
            strokeWidth={sw * 2}
            strokeDasharray={`${sw * 6} ${sw * 5}`}
          />
        );
    }
  })();

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {content}
      </svg>
    </AbsoluteFill>
  );
}
