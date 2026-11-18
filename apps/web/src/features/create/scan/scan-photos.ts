'use client';

import { create } from 'zustand';

export interface ScanPhoto {
  id: string;
  file: File;
  /** Object URL for the thumbnail; revoked on removal. */
  url: string;
}

interface ScanPhotos {
  photos: ScanPhoto[];
  add: (files: File[]) => void;
  remove: (id: string) => void;
  clear: () => void;
}

/** Photos picked for a card scan. In memory only: they are never saved or uploaded for storage. */
export const useScanPhotos = create<ScanPhotos>()((set) => ({
  photos: [],
  add: (files) =>
    set((s) => ({
      photos: [...s.photos, ...files.map((file) => ({ id: Math.random().toString(36).slice(2, 9), file, url: URL.createObjectURL(file) }))],
    })),
  remove: (id) =>
    set((s) => {
      const gone = s.photos.find((p) => p.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return { photos: s.photos.filter((p) => p.id !== id) };
    }),
  clear: () =>
    set((s) => {
      s.photos.forEach((p) => URL.revokeObjectURL(p.url));
      return { photos: [] };
    }),
}));
