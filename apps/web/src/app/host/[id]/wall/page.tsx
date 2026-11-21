'use client';

import { useQuery } from '@tanstack/react-query';
import { Maximize } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useEvent } from '@/lib/hooks';

interface AlbumPhoto {
  id: string;
  url: string;
  uploader: string;
}
interface Wish {
  id: string;
  name: string;
  message: string;
  hidden?: boolean;
}

const SLIDE_MS = 6000;

/**
 * Live photo wall for a TV or projector at the venue: guests' album uploads as a slideshow
 * (newest first, refreshed every 15 s) with their wishes along the bottom.
 */
export default function PhotoWallPage() {
  const { id } = useParams<{ id: string }>();
  const { data: event } = useEvent(id);
  const { data: photos = [] } = useQuery({
    queryKey: ['events', id, 'wall-album'],
    queryFn: () => api<{ items: AlbumPhoto[] }>(`/events/${id}/site/album`),
    select: (d) => d.items,
    refetchInterval: 15_000,
  });
  const { data: wishes = [] } = useQuery({
    queryKey: ['events', id, 'wall-wishes'],
    queryFn: () => api<Wish[] | { items: Wish[] }>(`/events/${id}/site/wishes`),
    select: (d) => (Array.isArray(d) ? d : d.items).filter((w) => !w.hidden).slice(0, 30),
    refetchInterval: 30_000,
  });
  const [i, setI] = useState(0);
  const [seen, setSeen] = useState(0);

  // A new upload jumps to the front so the guest sees it right away.
  useEffect(() => {
    if (photos.length > seen) {
      setI(0);
      setSeen(photos.length);
    }
  }, [photos.length, seen]);
  useEffect(() => {
    if (photos.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % photos.length), SLIDE_MS);
    return () => clearInterval(t);
  }, [photos.length]);

  const photo = photos[i % Math.max(1, photos.length)];
  const link = event ? `${typeof window !== 'undefined' ? window.location.host : ''}/i/${event.slug}` : '';

  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-white">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={photo.id} src={photo.url} alt={photo.uploader ? `Photo by ${photo.uploader}` : 'Guest photo'} className="absolute inset-0 size-full animate-fade-up object-contain" />
      ) : (
        <div className="grid h-full place-items-center px-8 text-center">
          <div>
            <p className="text-4xl" lang={event?.language}>
              {event?.title}
            </p>
            <p className="mt-4 text-xl text-white/70">Guests&apos; photos will appear here as they add them.</p>
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-4 bg-gradient-to-b from-black/70 to-transparent p-6">
        <div>
          <p className="text-2xl" lang={event?.language}>
            {event?.title}
          </p>
          {photo?.uploader && <p className="mt-1 text-white/75">Photo by {photo.uploader}</p>}
        </div>
        <div className="text-right">
          <p className="text-sm text-white/70">Add your photos</p>
          <p className="font-mono text-lg">{link}</p>
          <button
            type="button"
            onClick={() => void document.documentElement.requestFullscreen?.()}
            className="mt-2 inline-flex items-center gap-1.5 border border-white/30 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
          >
            <Maximize className="size-3.5" aria-hidden /> Full screen
          </button>
        </div>
      </div>

      {wishes.length > 0 && (
        <div className="absolute inset-x-0 bottom-0 overflow-hidden bg-black/60 py-4">
          <div className="flex w-max animate-[marquee_60s_linear_infinite] gap-12 whitespace-nowrap px-6 text-lg motion-reduce:animate-none">
            {[...wishes, ...wishes].map((w, k) => (
              <span key={`${w.id}-${k}`}>
                <span className="text-white/60">{w.name}:</span> {w.message}
              </span>
            ))}
          </div>
        </div>
      )}
      <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </main>
  );
}
