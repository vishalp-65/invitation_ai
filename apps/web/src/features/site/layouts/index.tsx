'use client';

import type { SiteDoc, SiteLayout } from '@cardai/shared';
import { ChatLayout } from './chat';
import { MovieLayout } from './movie';
import { ScrapbookLayout } from './scrapbook';
import { StoriesLayout } from './stories';
import { ArcadeLayout } from './arcade';
import { BoardingLayout } from './boarding';
import { CalendarLayout } from './calendar';
import { MenuLayout } from './menu';
import { NewspaperLayout } from './newspaper';
import { PlaylistLayout } from './playlist';
import './layouts.css';
import './layouts-more.css';

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
    case 'boarding':
      return <BoardingLayout doc={doc} />;
    case 'newspaper':
      return <NewspaperLayout doc={doc} />;
    case 'playlist':
      return <PlaylistLayout doc={doc} />;
    case 'arcade':
      return <ArcadeLayout doc={doc} />;
    case 'menu':
      return <MenuLayout doc={doc} />;
    case 'calendar':
      return <CalendarLayout doc={doc} />;
  }
}
