'use client';

import { useL } from '@/lib/use-l';
import { Dialog } from '@/components/ui/dialog';

const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

const GROUPS: Array<{ title: string; items: Array<[string, string[]]> }> = [
  {
    title: 'General',
    items: [
      ['Undo', [MOD, 'Z']],
      ['Redo', [MOD, 'Shift', 'Z']],
      ['Save now', [MOD, 'S']],
      ['Show shortcuts', ['?']],
    ],
  },
  {
    title: 'View',
    items: [
      ['Zoom in / out', [MOD, '+ / −']],
      ['Fit to screen', [MOD, '0']],
      ['Zoom at cursor', [MOD, 'Scroll']],
      ['Pan', ['Space', 'Drag']],
      ['Next / previous page', ['PgDn / PgUp']],
    ],
  },
  {
    title: 'Selection',
    items: [
      ['Add to selection', ['Shift', 'Click']],
      ['Select several', ['Drag on empty space']],
      ['Select all', [MOD, 'A']],
      ['Group / ungroup', [MOD, '(Shift)', 'G']],
      ['Pick one layer in a group', ['Double-click']],
      ['Edit text', ['Enter']],
      ['Copy / cut / paste', [MOD, 'C / X / V']],
      ['Duplicate', [MOD, 'D']],
      ['Delete', ['Del']],
      ['Nudge (×10)', ['Arrows', '(Shift)']],
      ['Forward / backward', [MOD, '] / [']],
      ['To front / back', [MOD, 'Shift', '] / [']],
      ['Lock / unlock', [MOD, 'Shift', 'L']],
      ['Rotate in 15° steps', ['Shift', 'Drag']],
      ['Move without snapping', ['Alt', 'Drag']],
      ['Deselect', ['Esc']],
    ],
  },
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const L = useL();
  return (
    <Dialog open={open} onClose={onClose} title={L('Keyboard shortcuts')}>
      <div className="flex flex-col gap-5 pb-2">
        {GROUPS.map((g) => (
          <section key={L(g.title)}>
            <h3 className="mb-2 font-sans text-xs font-medium uppercase tracking-wide text-ink-soft">{L(g.title)}</h3>
            <ul className="flex flex-col">
              {g.items.map(([label, keys]) => (
                <li key={label} className="flex items-center justify-between gap-3 border-b border-ink/10 py-2 text-sm last:border-0">
                  <span>{L(label)}</span>
                  <span className="flex gap-1">
                    {keys.map((k) => (
                      <kbd key={k} className="rounded-md border border-ink/10 bg-mist px-1.5 py-0.5 font-sans text-xs font-medium">
                        {k}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
