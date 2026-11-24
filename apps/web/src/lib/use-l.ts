'use client';

import { useMessages } from 'next-intl';
import { useCallback } from 'react';

type Vars = Record<string, string | number>;

/** next-intl reserves "." for nesting, so `ui` keys store it as "․" (U+2024, one dot leader). */
export const uiKey = (text: string) => text.replaceAll('.', '․');

/**
 * Text-keyed translations for the editor and sign-in UI (`messages.ui`): the English text is
 * the key, so labels kept in plain data (tool lists, menus) translate where they are shown with
 * `L(item.label)`. Anything not translated (or not a string, or a server message) shows as is.
 * `{name}` placeholders are filled from `vars`.
 *
 * Changing an English string means updating its key in every `messages/*.json` `ui` section
 * (keys are the English text with "." written as "․", see `uiKey`).
 */
export function useL() {
  // `messages` is stable per locale, so L keeps its identity across renders.
  const messages = useMessages() as { ui?: Record<string, string> };
  return useCallback(
    <T>(text: T, vars?: Vars): T => {
      if (typeof text !== 'string') return text;
      let out = messages.ui?.[uiKey(text)] ?? text;
      if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
      return out as T;
    },
    [messages],
  );
}
