import type { ImageElement } from '@cardai/shared';
import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { currentPage, useEditor } from './store';

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export const CROP_ZOOM_MAX = 4;

function liveImage(id: string): ImageElement | null {
  const el = currentPage(useEditor.getState())?.elements.find((e) => e.id === id);
  return el?.type === 'image' ? el : null;
}

export function setCropZoom(id: string, z: number) {
  useEditor.getState().update(id, { zoom: Math.round(clamp(z, 1, CROP_ZOOM_MAX) * 100) / 100 } as Partial<ImageElement>);
}

/**
 * Move a photo inside its frame (drag), zoom it (wheel or two-finger pinch). The same rules for
 * the inspector's crop pad and for cropping right on the card: `boxRef` is whatever shows the
 * frame, so a drag of one frame-width moves the photo by one frame-width. Each drag or burst of
 * wheel ticks is one undo step.
 */
export function useCropGestures(id: string, boxRef: RefObject<HTMLElement | null>) {
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const pinch0 = useRef<{ d: number; z: number } | null>(null);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const node = boxRef.current;
    if (!node) return;
    // A native listener: React's wheel handlers are passive and could not stop the page scrolling.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!wheelTimer.current) useEditor.getState().begin();
      else clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(() => {
        wheelTimer.current = null;
        useEditor.getState().end();
      }, 250);
      const cur = liveImage(id);
      if (cur) setCropZoom(id, (cur.zoom ?? 1) * Math.exp(-e.deltaY * (e.deltaMode === 1 ? 16 : 1) * 0.0025));
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      node.removeEventListener('wheel', onWheel);
      if (wheelTimer.current) {
        clearTimeout(wheelTimer.current);
        wheelTimer.current = null;
        useEditor.getState().end();
      }
    };
  }, [id, boxRef]);

  const release = (pointerId: number) => {
    if (!pts.current.delete(pointerId)) return;
    pinch0.current = null;
    if (pts.current.size === 0) useEditor.getState().end();
  };

  return {
    onPointerDown(e: ReactPointerEvent<HTMLElement>) {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      if (pts.current.size === 0) useEditor.getState().begin();
      pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.current.size === 2) {
        const [a, b] = [...pts.current.values()];
        pinch0.current = { d: Math.hypot(a!.x - b!.x, a!.y - b!.y), z: liveImage(id)?.zoom ?? 1 };
      }
    },
    onPointerMove(e: ReactPointerEvent<HTMLElement>) {
      const prev = pts.current.get(e.pointerId);
      const el = liveImage(id);
      if (!prev || !el) return;
      const now = { x: e.clientX, y: e.clientY };
      pts.current.set(e.pointerId, now);
      if (pts.current.size >= 2 && pinch0.current) {
        const [a, b] = [...pts.current.values()];
        setCropZoom(id, pinch0.current.z * (Math.hypot(a!.x - b!.x, a!.y - b!.y) / Math.max(1, pinch0.current.d)));
        return;
      }
      // The frame may be rotated on the card: measure the drag along the frame's own axes, against
      // its own (unrotated) size, so a drag of one frame-width moves the photo one frame-width.
      const node = e.currentTarget;
      const rad = (-el.rot * Math.PI) / 180;
      const dx = (now.x - prev.x) * Math.cos(rad) - (now.y - prev.y) * Math.sin(rad);
      const dy = (now.x - prev.x) * Math.sin(rad) + (now.y - prev.y) * Math.cos(rad);
      // Dragging right moves the picture right, i.e. the focal point left.
      const k = 100 / Math.max(1, el.zoom ?? 1);
      useEditor.getState().update(id, {
        fx: clamp((el.fx ?? 50) - (dx / Math.max(1, node.offsetWidth)) * k, 0, 100),
        fy: clamp((el.fy ?? 50) - (dy / Math.max(1, node.offsetHeight)) * k, 0, 100),
      } as Partial<ImageElement>);
    },
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => release(e.pointerId),
    onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => release(e.pointerId),
  };
}
