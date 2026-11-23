'use client';

import dynamic from 'next/dynamic';

/*
 * Drawn scene art and illustrated characters are the heaviest code on the guest page. They load
 * only when a design actually shows them (photo designs never do), still server-rendered.
 */
export const SceneLayer = dynamic(() => import('@cardai/templates/scenes').then((m) => m.SceneLayer));
export const SceneStill = dynamic(() => import('@cardai/templates/scenes').then((m) => m.SceneStill));
export const DressFigures = dynamic(() => import('@cardai/templates/scenes').then((m) => m.DressFigures));
export const VintageCar = dynamic(() => import('@cardai/templates/scenes').then((m) => m.VintageCar));
export const Character = dynamic(() => import('./characters').then((m) => m.Character));
