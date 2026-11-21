'use client';

import { clsx } from 'clsx';
import { Check, ChevronDown } from 'lucide-react';
import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FocusEventHandler,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { controlClass } from './control-class';

/**
 * Drop-in replacement for a native `<select>`: same children (`<option>` / `<optgroup>`), same
 * `value` + `onChange(e => e.target.value)` contract, but the list is our own flat popover instead
 * of the OS menu. Keyboard follows the ARIA combobox/listbox pattern (focus stays on the trigger):
 * arrows, Home/End, PageUp/PageDown, Enter/Space, Escape, Tab, and type-ahead.
 */
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'defaultValue' | 'onChange' | 'multiple' | 'size'> {
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  /**
   * `field` (default): bordered form control. `plain`: same layout, but colours/border come from
   * `className` (guest-site themes). `bare`: inline text + chevron, no box (header pickers).
   */
  variant?: 'field' | 'plain' | 'bare';
  /** Shown when no option matches the value. */
  placeholder?: string;
  /** Extra classes for the popover list. */
  menuClassName?: string;
}

type Item =
  | { kind: 'option'; value: string; label: ReactNode; text: string; disabled: boolean }
  | { kind: 'group'; label: string };

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return '';
}

function collect(children: ReactNode, out: Item[] = [], groupDisabled = false): Item[] {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode; value?: string | number; disabled?: boolean; label?: string }>;
    if (el.type === Fragment) collect(el.props.children, out, groupDisabled);
    else if (el.type === 'optgroup') {
      out.push({ kind: 'group', label: el.props.label ?? '' });
      collect(el.props.children, out, groupDisabled || !!el.props.disabled);
    } else if (el.type === 'option') {
      const text = textOf(el.props.children);
      out.push({
        kind: 'option',
        value: el.props.value != null ? String(el.props.value) : text,
        label: el.props.children,
        text,
        disabled: groupDisabled || !!el.props.disabled,
      });
    }
  });
  return out;
}

/** Guest-site theme vars the popover (portalled to <body>) must carry over from the trigger. */
const FORWARD_VARS = ['--inv-surface', '--inv-on-surface', '--inv-primary', '--inv-on-primary', '--inv-body'];

export function Select({
  value,
  defaultValue,
  onChange,
  children,
  className,
  variant = 'field',
  placeholder,
  menuClassName,
  disabled,
  id,
  name,
  required,
  style,
  title,
  onBlur,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: SelectProps) {
  const items = useMemo(() => collect(children), [children]);
  const options = useMemo(() => items.filter((i): i is Extract<Item, { kind: 'option' }> => i.kind === 'option'), [items]);

  const [inner, setInner] = useState(() => String(defaultValue ?? options[0]?.value ?? ''));
  const current = value !== undefined ? String(value) : inner;
  const selectedIndex = options.findIndex((o) => o.value === current);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<CSSProperties>({});
  const typed = useRef({ text: '', at: 0 });
  const listId = useId();
  const optId = (i: number) => `${listId}-o${i}`;

  const enabled = useCallback((i: number) => !!options[i] && !options[i]!.disabled, [options]);
  const step = useCallback(
    (from: number, dir: 1 | -1) => {
      for (let i = from + dir; i >= 0 && i < options.length; i += dir) if (enabled(i)) return i;
      return from;
    },
    [options.length, enabled],
  );
  const first = () => step(-1, 1);
  const last = () => step(options.length, -1);

  const commit = (i: number) => {
    const o = options[i];
    if (!o || o.disabled) return;
    if (o.value !== current) {
      if (value === undefined) setInner(o.value);
      const target = { value: o.value, name: name ?? '', id: id ?? '' } as unknown as EventTarget & HTMLSelectElement;
      onChange?.({ target, currentTarget: target } as ChangeEvent<HTMLSelectElement>);
    }
  };

  const show = () => {
    if (disabled) return;
    setActive(selectedIndex >= 0 && enabled(selectedIndex) ? selectedIndex : first());
    setOpen(true);
  };
  const hide = (refocus = true) => {
    setOpen(false);
    setPos({});
    if (refocus) triggerRef.current?.focus();
  };

  // Place the list under the trigger (or above it when there is no room), fixed to the viewport.
  const place = useCallback(() => {
    const t = triggerRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const below = vh - r.bottom - 8;
    const above = r.top - 8;
    const up = below < 220 && above > below;
    const maxHeight = Math.max(120, Math.min(320, (up ? above : below) - 4));
    const width = listRef.current?.offsetWidth ?? r.width;
    const left = Math.max(8, Math.min(r.left, vw - width - 8));
    const vars: Record<string, string> = {};
    const cs = getComputedStyle(t);
    for (const v of FORWARD_VARS) {
      const val = cs.getPropertyValue(v).trim();
      if (val) vars[v] = val;
    }
    setPos({
      ...vars,
      position: 'fixed',
      left,
      minWidth: r.width,
      maxWidth: Math.min(384, vw - 16),
      maxHeight,
      ...(up ? { bottom: vh - r.top + 4 } : { top: r.bottom + 4 }),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    // Second pass once the list has its real width (for right-edge clamping).
    const raf = requestAnimationFrame(place);
    return () => cancelAnimationFrame(raf);
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const onMove = (e: Event) => {
      if (e.target instanceof Node && listRef.current?.contains(e.target)) return; // scrolling the list itself
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(place);
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!listRef.current?.contains(t) && !triggerRef.current?.contains(t)) hide(false);
    };
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [open, place]);

  useEffect(() => {
    // Scroll only the list (never the page) to keep the highlighted option visible.
    const list = listRef.current;
    const el = open && active >= 0 ? document.getElementById(optId(active)) : null;
    if (!list || !el) return;
    const top = el.offsetTop - 4;
    const bottom = el.offsetTop + el.offsetHeight + 4;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  const typeahead = (key: string) => {
    const now = Date.now();
    const t = typed.current;
    t.text = now - t.at > 700 ? key : t.text + key;
    t.at = now;
    const q = t.text.toLowerCase();
    const start = open ? active : selectedIndex;
    // A repeated single letter cycles through matches; a longer prefix finds the first match.
    const order = [...options.keys()].map((k) => (k + Math.max(start, 0) + (q.length === 1 ? 1 : 0)) % options.length);
    const hit = order.find((i) => enabled(i) && options[i]!.text.trim().toLowerCase().startsWith(q));
    if (hit === undefined) return;
    if (open) setActive(hit);
    else commit(hit);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const k = e.key;
    if (!open) {
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || k === ' ') {
        e.preventDefault();
        show();
      } else if (k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        typeahead(k);
      }
      return;
    }
    switch (k) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((a) => step(a, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (e.altKey) {
          commit(active);
          hide();
          return;
        }
        setActive((a) => step(a, -1));
        break;
      case 'Home':
        e.preventDefault();
        setActive(first());
        break;
      case 'End':
        e.preventDefault();
        setActive(last());
        break;
      case 'PageDown':
        e.preventDefault();
        setActive((a) => {
          let i = a;
          for (let n = 0; n < 8; n++) i = step(i, 1);
          return i;
        });
        break;
      case 'PageUp':
        e.preventDefault();
        setActive((a) => {
          let i = a;
          for (let n = 0; n < 8; n++) i = step(i, -1);
          return i;
        });
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        commit(active);
        hide();
        break;
      case 'Escape':
        // Keep dialogs/sheets underneath from closing too.
        e.preventDefault();
        e.stopPropagation();
        hide();
        break;
      case 'Tab':
        hide(false);
        break;
      default:
        if (k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          typeahead(k);
        }
    }
  };

  const bare = variant === 'bare';
  const cls = className ?? '';
  const has = (re: RegExp) => re.test(cls);

  const list =
    open &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        ref={listRef}
        id={listId}
        role="listbox"
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabelledBy ? undefined : ariaLabel ?? textOf(selected?.label)}
        tabIndex={-1}
        style={pos.position ? pos : { position: 'fixed', top: 0, left: 0, visibility: 'hidden' }}
        // Keep focus on the trigger while clicking inside the list.
        onMouseDown={(e) => e.preventDefault()}
        className={clsx(
          'menu thin-scroll z-[1000] overflow-y-auto overscroll-contain text-sm [animation:select-in_120ms_var(--ease-out-quint)]',
          'bg-[var(--inv-surface,var(--color-surface))] text-[var(--inv-on-surface,var(--color-ink))]',
          menuClassName,
        )}
      >
        {items.length === 0 && <div className="px-2.5 py-2 text-ink-soft">No options</div>}
        {(() => {
          let oi = -1;
          return items.map((it, n) => {
            if (it.kind === 'group')
              return (
                <div key={`g${n}`} role="presentation" className="px-2.5 pb-1 pt-2.5 font-mono text-[0.6875rem] uppercase tracking-wide opacity-55 first:pt-1.5">
                  {it.label}
                </div>
              );
            const i = ++oi;
            const isSel = it.value === current;
            const isActive = i === active;
            return (
              <div
                key={`o${i}`}
                id={optId(i)}
                role="option"
                aria-selected={isSel}
                aria-disabled={it.disabled || undefined}
                onPointerMove={() => !it.disabled && i !== active && setActive(i)}
                onClick={() => {
                  if (it.disabled) return;
                  commit(i);
                  hide();
                }}
                className={clsx(
                  'flex min-h-9 cursor-pointer select-none items-center gap-2.5 rounded-[6px] py-1.5 pl-2.5 pr-2 leading-snug transition-colors duration-75',
                  isActive && 'bg-[color-mix(in_srgb,currentColor_8%,transparent)]',
                  isSel && 'font-medium',
                  it.disabled && 'cursor-not-allowed opacity-40',
                )}
              >
                <span className="min-w-0 flex-1 truncate">{it.label === '' || it.label == null ? ' ' : it.label}</span>
                <Check aria-hidden className={clsx('size-4 shrink-0 text-[var(--inv-primary,var(--color-gold))]', !isSel && 'invisible')} strokeWidth={2.25} />
              </div>
            );
          });
        })()}
      </div>,
      document.body,
    );

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? optId(active) : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-required={required || undefined}
        disabled={disabled}
        title={title}
        style={style}
        onClick={() => (open ? hide() : show())}
        onKeyDown={onKeyDown}
        onBlur={onBlur as unknown as FocusEventHandler<HTMLButtonElement>}
        className={clsx(
          bare
            ? 'inline-flex cursor-pointer items-center gap-1 bg-transparent text-inherit outline-none disabled:cursor-not-allowed disabled:opacity-60'
            : [
                variant === 'field' && controlClass,
                'relative inline-flex cursor-pointer items-center text-left disabled:cursor-not-allowed',
                !has(/(^|\s)(w-|flex-1|min-w-)/) && 'w-full',
                !has(/(^|\s)h-/) && 'h-10',
                !has(/(^|\s)(px-|pl-)/) && 'pl-3',
                !has(/(^|\s)pr-/) && 'pr-9',
                !has(/(^|\s)text-(xs|sm|base|lg|\[)/) && 'text-[0.95rem]',
                open && variant === 'field' && 'border-ink',
              ],
          className,
        )}
      >
        <span className={clsx('min-w-0 truncate', !bare && 'flex-1', !selected && 'opacity-60')}>{selected ? selected.label : placeholder ?? ' '}</span>
        <ChevronDown
          aria-hidden
          className={clsx(
            'shrink-0 opacity-55 transition-transform duration-150',
            bare ? 'size-3.5' : 'pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2',
            open && (bare ? 'rotate-180' : '-translate-y-1/2 rotate-180'),
          )}
        />
      </button>
      {name && <input type="hidden" name={name} value={current} />}
      {list}
    </>
  );
}
