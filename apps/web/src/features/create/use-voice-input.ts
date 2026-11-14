'use client';

import { getLanguage, type LanguageCode } from '@cardai/shared';
import { useCallback, useRef, useState } from 'react';

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

/**
 * Browser speech-to-text (free, on-device on Android Chrome) in the invite's language.
 * Helps users who find typing in Devanagari/Tamil hard.
 */
export function useVoiceInput(language: LanguageCode, onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const rec = useRef<SpeechRecognitionLike | null>(null);

  const Ctor =
    typeof window !== 'undefined'
      ? ((window as unknown as Record<string, unknown>).SpeechRecognition ??
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition)
      : undefined;

  const toggle = useCallback(() => {
    if (!Ctor) return;
    if (listening) {
      rec.current?.stop();
      return;
    }
    const r = new (Ctor as new () => SpeechRecognitionLike)();
    r.lang = getLanguage(language).locale;
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      const text = Array.from(e.results)
        .map((res) => res[0]?.transcript ?? '')
        .join(' ');
      if (text) onText(text);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  }, [Ctor, language, listening, onText]);

  return { supported: Boolean(Ctor), listening, toggle };
}
