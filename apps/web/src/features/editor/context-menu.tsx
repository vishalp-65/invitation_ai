'use client';

import type { TextElement } from '@cardai/shared';
import { clsx } from 'clsx';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  ArrowDownToLine,
  ArrowUpToLine,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Eye,
  Group,
  Lock,
  PencilLine,
  Scissors,
  Trash2,
  Ungroup,
  Unlock,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { currentPage, selectedElements, useEditor } from './store';

export interface MenuState {
  x: number;
  y: number;
  id: string | null;
}

const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';

type Item = { label: string; icon: LucideIcon; kbd?: string; run: () => void; danger?: boolean; disabled?: boolean } | 'sep';

/** Right-click menu for the canvas (keyboard-navigable, closes on outside click / Esc / scroll). */
export function ContextMenu({ state, onClose, onEditText }: { state: MenuState; onClose: () => void; onEditText: (el: TextElement) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: state.x, y: state.y });
  const s = useEditor.getState();
  const el = state.id ? (currentPage(s)?.elements.find((e) => e.id === state.id) ?? null) : null;
  const canPaste = useEditor((st) => st.hasClipboard);

  // Keep inside the viewport.
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const r = m.getBoundingClientRect();
    setPos({ x: Math.min(state.x, window.innerWidth - r.width - 8), y: Math.min(state.y, window.innerHeight - r.height - 8) });
    m.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
  }, [state.x, state.y]);

  useEffect(() => {
    const away = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = [...(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
        const i = items.indexOf(document.activeElement as HTMLButtonElement);
        items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
      }
    };
    window.addEventListener('pointerdown', away, true);
    window.addEventListener('keydown', key);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('pointerdown', away, true);
      window.removeEventListener('keydown', key);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  const many = selectedElements(s);
  const ids = many.map((m) => m.id);
  const grouped = many.length > 1 && many.every((m) => m.group && m.group === many[0]!.group);
  const items: Item[] = el && many.length > 1 && ids.includes(el.id)
    ? [
        grouped
          ? { label: 'Ungroup', icon: Ungroup, kbd: `${MOD}⇧G`, run: () => s.ungroup(ids) }
          : { label: 'Group', icon: Group, kbd: `${MOD}G`, run: () => s.group(ids) },
        'sep',
        { label: 'Copy', icon: Copy, kbd: `${MOD}C`, run: () => s.copyMany(ids) },
        { label: 'Paste', icon: ClipboardPaste, kbd: `${MOD}V`, run: () => s.paste(), disabled: !canPaste },
        { label: 'Duplicate', icon: CopyPlus, kbd: `${MOD}D`, run: () => s.duplicateMany(ids) },
        'sep',
        { label: 'Align centres', icon: AlignCenterVertical, run: () => s.alignMany(ids, 'hcenter') },
        { label: 'Align middles', icon: AlignCenterHorizontal, run: () => s.alignMany(ids, 'vcenter') },
        { label: 'Space evenly across', icon: AlignHorizontalSpaceAround, run: () => s.distribute(ids, 'x'), disabled: many.length < 3 },
        { label: 'Space evenly down', icon: AlignVerticalSpaceAround, run: () => s.distribute(ids, 'y'), disabled: many.length < 3 },
        'sep',
        { label: 'Bring to front', icon: ArrowUpToLine, run: () => s.arrangeMany(ids, 'front') },
        { label: 'Send to back', icon: ArrowDownToLine, run: () => s.arrangeMany(ids, 'back') },
        'sep',
        { label: 'Delete', icon: Trash2, kbd: 'Del', run: () => s.removeMany(ids), danger: true },
      ]
    : el
    ? [
        ...(el.type === 'text' && !el.locked ? [{ label: 'Edit text', icon: PencilLine, kbd: 'Enter', run: () => onEditText(el) } as Item, 'sep' as const] : []),
        { label: 'Copy', icon: Copy, kbd: `${MOD}C`, run: () => s.copy(el.id) },
        { label: 'Cut', icon: Scissors, kbd: `${MOD}X`, run: () => s.cut(el.id), disabled: el.locked },
        { label: 'Paste', icon: ClipboardPaste, kbd: `${MOD}V`, run: () => s.paste(), disabled: !canPaste },
        { label: 'Duplicate', icon: CopyPlus, kbd: `${MOD}D`, run: () => s.duplicate(el.id), disabled: el.locked },
        'sep',
        { label: 'Bring forward', icon: ChevronUp, kbd: `${MOD}]`, run: () => s.arrange(el.id, 'forward') },
        { label: 'Send backward', icon: ChevronDown, kbd: `${MOD}[`, run: () => s.arrange(el.id, 'backward') },
        { label: 'Bring to front', icon: ArrowUpToLine, run: () => s.arrange(el.id, 'front') },
        { label: 'Send to back', icon: ArrowDownToLine, run: () => s.arrange(el.id, 'back') },
        'sep',
        { label: 'Centre on page', icon: AlignCenterVertical, run: () => s.align(el.id, 'hcenter'), disabled: el.locked },
        { label: 'Middle of page', icon: AlignCenterHorizontal, run: () => s.align(el.id, 'vcenter'), disabled: el.locked },
        'sep',
        { label: el.locked ? 'Unlock' : 'Lock', icon: el.locked ? Unlock : Lock, kbd: `${MOD}⇧L`, run: () => s.update(el.id, { locked: !el.locked }) },
        { label: 'Hide', icon: Eye, run: () => s.update(el.id, { hidden: true }) },
        { label: 'Delete', icon: Trash2, kbd: 'Del', run: () => s.remove(el.id), danger: true, disabled: el.locked },
      ]
    : [
        { label: 'Paste', icon: ClipboardPaste, kbd: `${MOD}V`, run: () => s.paste(), disabled: !canPaste },
        { label: 'Select all', icon: CopyPlus, kbd: `${MOD}A`, run: () => s.selectAll() },
      ];

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-50 min-w-[220px] origin-top-left animate-[pop-in_0.1s_ease-out] menu text-sm"
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((it, i) =>
        it === 'sep' ? (
          <div key={`sep${i}`} className="menu-sep" role="separator" />
        ) : (
          <button
            key={it.label}
            type="button"
            role="menuitem"
            disabled={it.disabled}
            onClick={() => {
              it.run();
              onClose();
            }}
            className={clsx(
              'menu-item h-8',
              it.danger && 'text-sindoor',
            )}
          >
            <it.icon className="size-4 shrink-0 opacity-80" />
            <span className="flex-1">{it.label}</span>
            {it.kbd && <kbd className="font-sans text-xs text-ink-soft">{it.kbd}</kbd>}
          </button>
        ),
      )}
    </div>
  );
}
