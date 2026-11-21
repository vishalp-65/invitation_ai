'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from './button';
import { controlClass } from './control-class';

/**
 * In-app replacements for `window.confirm()` / `window.prompt()`: same one-line call, but a
 * themed dialog instead of the browser's grey box. `await confirmDialog('Delete this draft?')`.
 *
 * A plain string is split into a title (first question/sentence) and a body (the rest). The
 * confirm button takes the title's leading verb ("Delete", "Refund"…) and turns red for
 * destructive verbs, so most call sites need no options. One <ConfirmLayer/> lives in Providers.
 */
export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}
export interface PromptOptions extends ConfirmOptions {
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  /** Confirm stays disabled until the field equals this text (e.g. "DELETE"). */
  match?: string;
  multiline?: boolean;
}

type Request =
  | { kind: 'confirm'; opts: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: 'prompt'; opts: PromptOptions; resolve: (v: string | null) => void };

let enqueue: ((r: Request) => void) | null = null;

const DANGER = new Set(['delete', 'remove', 'disable', 'refund', 'take', 'hide', 'close', 'sign', 'reject']);
const VERBS = new Set([...DANGER, 'send', 'turn', 'switch', 'allow', 'enable', 'go', 'view', 'schedule', 'publish', 'restore', 'approve']);

function normalise(input: string | ConfirmOptions): ConfirmOptions {
  if (typeof input !== 'string') return input;
  const m = /^(.+?[?.!])\s+(.+)$/s.exec(input.trim());
  const title = m ? m[1]! : input.trim();
  const body = m ? m[2] : undefined;
  const first = title.split(/\s+/)[0]!.toLowerCase();
  const second = title.split(/\s+/)[1]?.toLowerCase();
  // "Take … off sale", "Sign … out", "Turn on …", "Go back …" read better with the particle.
  const phrase =
    first === 'take' ? (/\boff\b/i.test(title) ? 'Take off' : 'Take down') : first === 'sign' ? 'Sign out' : first === 'turn' ? `Turn ${second ?? 'on'}` : first === 'go' ? 'Go back' : null;
  const verb = VERBS.has(first) ? (phrase ?? first[0]!.toUpperCase() + first.slice(1)) : undefined;
  return { title, body, confirmLabel: verb, danger: DANGER.has(first) };
}

export function confirmDialog(input: string | ConfirmOptions): Promise<boolean> {
  const opts = normalise(input);
  if (!enqueue) return Promise.resolve(window.confirm([opts.title, opts.body].filter(Boolean).join('\n\n')));
  return new Promise((resolve) => enqueue!({ kind: 'confirm', opts, resolve }));
}

export function promptDialog(input: string | PromptOptions): Promise<string | null> {
  const opts: PromptOptions = typeof input === 'string' ? { ...normalise(input), confirmLabel: normalise(input).confirmLabel ?? 'OK' } : input;
  if (!enqueue) return Promise.resolve(window.prompt(opts.title, opts.defaultValue));
  return new Promise((resolve) => enqueue!({ kind: 'prompt', opts, resolve }));
}

export function ConfirmLayer() {
  const [queue, setQueue] = useState<Request[]>([]);
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const [text, setText] = useState('');
  const titleId = useId();
  const bodyId = useId();
  const req = queue[0];

  useEffect(() => {
    enqueue = (r) => setQueue((q) => [...q, r]);
    return () => {
      enqueue = null;
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !req) return;
    setText(req.kind === 'prompt' ? (req.opts.defaultValue ?? '') : '');
    if (!el.open) el.showModal();
    requestAnimationFrame(() => (req.kind === 'prompt' ? inputRef.current?.focus() : el.querySelector<HTMLButtonElement>('[data-confirm]')?.focus()));
  }, [req]);

  const finish = (ok: boolean) => {
    if (!req) return;
    if (req.kind === 'confirm') req.resolve(ok);
    else req.resolve(ok ? ((req.opts as PromptOptions).match ? text.trim() : text) : null);
    ref.current?.close();
    setQueue((q) => q.slice(1));
  };

  const o = req?.opts;
  const p = req?.kind === 'prompt' ? (req.opts as PromptOptions) : null;
  const blocked = !!p?.match && text.trim() !== p.match;

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={o?.body ? bodyId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        finish(false);
      }}
      onClick={(e) => e.target === ref.current && finish(false)}
      className="fixed m-auto w-[calc(100%-2rem)] max-w-md animate-[pop-in_0.16s_var(--ease-out-quint)] rounded-[var(--radius-card)] border border-ink/15 bg-ivory p-0 text-ink backdrop:bg-[var(--color-overlay)]"
    >
      {o && (
        <form
          method="dialog"
          className="flex flex-col gap-5 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!blocked) finish(true);
          }}
        >
          <div className="flex gap-3.5">
            {o.danger && (
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sindoor/10 text-sindoor" aria-hidden>
                <AlertTriangle className="size-4.5" />
              </span>
            )}
            <div className="flex min-w-0 flex-col gap-1.5 pt-1">
              <h2 id={titleId} className="font-sans text-[1.0625rem] font-medium leading-snug tracking-normal [text-wrap:pretty]">
                {o.title}
              </h2>
              {o.body && (
                <p id={bodyId} className="text-sm leading-relaxed text-ink-soft">
                  {o.body}
                </p>
              )}
            </div>
          </div>
          {p && (
            <label className="flex flex-col gap-1.5">
              {(p.label || p.match) && <span className="text-sm font-medium">{p.label ?? `Type ${p.match} to confirm`}</span>}
              {p.multiline ? (
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={p.placeholder}
                  rows={3}
                  className={`${controlClass} w-full resize-y px-3 py-2 text-[0.95rem] leading-relaxed`}
                />
              ) : (
                <input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={p.placeholder ?? p.match}
                  autoComplete="off"
                  spellCheck={false}
                  className={`${controlClass} h-10 w-full px-3 text-[0.95rem]`}
                />
              )}
            </label>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="line" size="sm" onClick={() => finish(false)}>
              {o.cancelLabel ?? 'Cancel'}
            </Button>
            <Button
              type="submit"
              data-confirm
              size="sm"
              variant={o.danger ? 'brand' : 'primary'}
              disabled={blocked}
            >
              {o.confirmLabel ?? 'Confirm'}
            </Button>
          </div>
        </form>
      )}
    </dialog>
  );
}
