'use client';

import type { SiteDoc, SiteLayout } from '@cardai/shared';
import { ChatLayout } from './chat';
import { MovieLayout } from './movie';
import { ScrapbookLayout } from './scrapbook';
import { StoriesLayout } from './stories';
import './layouts.css';

/** The layout's own page top (replaces the hero and the sections it covers). */
export function LayoutView({ layout, doc, started }: { layout: SiteLayout; doc: SiteDoc; started: boolean }) {
  switch (layout) {
    case 'stories':
      return <StoriesLayout doc={doc} started={started} />;
    case 'movie':
      return <MovieLayout doc={doc} />;
    case 'chat':
      return <ChatLayout doc={doc} />;
    case 'scrapbook':
      return <ScrapbookLayout doc={doc} />;
  }
}
