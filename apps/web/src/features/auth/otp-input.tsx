'use client';

import { clsx } from 'clsx';
import { useEffect, useRef } from 'react';

const LENGTH = 6;

/**
 * Six boxes, one digit each. Handles typing, paste, backspace/arrow navigation and the SMS/email
 * autofill suggestion on iOS and Android (which drops the whole code into the first box).
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  invalid,
  disabled,
  label = 'Verification code',
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? '');

  // Focus the first empty box on mount and again when a verify attempt finishes (disabled → enabled).
  useEffect(() => {
    if (!disabled) refs.current[Math.min(value.length, LENGTH - 1)]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  function commit(next: string, focusIndex: number) {
    const clean = next.replace(/\D/g, '').slice(0, LENGTH);
    onChange(clean);
    refs.current[Math.min(focusIndex, LENGTH - 1)]?.focus();
    if (clean.length === LENGTH) onComplete?.(clean);
  }

  return (
    <div role="group" aria-label={label} className="flex justify-between gap-2 sm:gap-3">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          pattern="\d*"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1} of ${LENGTH}`}
          aria-invalid={invalid}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const typed = e.target.value.replace(/\D/g, '');
            if (!typed) return commit(value.slice(0, i) + value.slice(i + 1), i);
            // One digit replaces this box; several (paste / autofill) fill forward from here.
            const next = value.slice(0, i) + typed + value.slice(i + 1);
            commit(next, i + typed.length);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !d && i > 0) {
              e.preventDefault();
              commit(value.slice(0, i - 1) + value.slice(i), i - 1);
            } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
            else if (e.key === 'ArrowRight' && i < LENGTH - 1) refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
            if (pasted) commit(pasted, pasted.length);
          }}
          className={clsx(
            'h-14 w-full min-w-0 rounded-lg border-2 bg-surface text-center font-display text-2xl tabular-nums text-ink caret-sindoor transition-colors duration-150 focus:border-ink focus:outline-none disabled:opacity-60 sm:h-16',
            invalid ? 'border-sindoor' : d ? 'border-ink/60' : 'border-line',
          )}
        />
      ))}
    </div>
  );
}
