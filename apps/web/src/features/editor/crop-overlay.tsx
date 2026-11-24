'use client';

import { useL } from '@/lib/use-l';
import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';
import { useCropGestures } from './crop-gestures';
import { useEditor } from './store';

/**
 * Crop right on the card: lay over a selected photo frame, drag to move the photo inside it,
 * scroll or pinch to zoom. Esc, Enter, a click elsewhere or the Done button finishes.
 */
export function CropOverlay({ id, style, above, onDone }: { id: string; style: CSSProperties; above: boolean; onDone: () => void }) {
  const L = useL();
  const box = useRef<HTMLDivElement>(null);
  const gestures = useCropGestures(id, box);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.key !== 'Enter') return;
      e.preventDefault();
      e.stopPropagation();
      onDone();
    };
    // A press anywhere outside the frame (and its hint) ends cropping, then does what it normally would.
    const onPress = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('[data-crop-overlay]')) onDone();
    };
    const unsub = useEditor.subscribe((s, prev) => {
      if (s.selected !== prev.selected && s.selected !== id) onDone();
    });
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPress, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onPress, true);
      unsub();
    };
  }, [id, onDone]);

  return (
    <div className="absolute" style={style} data-crop-overlay>
      <div
        ref={box}
        {...gestures}
        className="absolute inset-0 cursor-grab touch-none rounded-[2px] outline outline-2 outline-[#F2A900] [box-shadow:0_0_0_9999px_rgb(0_0_0/0.28)] active:cursor-grabbing"
        aria-label={L('Drag the photo to reposition it. Scroll or pinch to zoom.')}
        role="img"
      />
      <div className={`pointer-events-auto absolute left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white ${above ? 'bottom-full mb-3' : 'top-full mt-3'}`}>
        <span>{L('Drag to move · scroll or pinch to zoom')}</span>
        <button type="button" onClick={onDone} className="rounded-full bg-white/20 px-2.5 py-0.5 font-semibold hover:bg-white/30">
          {L('Done')}
        </button>
      </div>
    </div>
  );
}
