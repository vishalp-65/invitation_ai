import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';

/**
 * Everything the app (marketing, dashboard, editor, admin) needs around its pages: translations,
 * data fetching, toasts, tooltips and dialogs. Guest invitation pages don't use it.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="ambient" aria-hidden />
      <NextIntlClientProvider>
        <Providers>{children}</Providers>
      </NextIntlClientProvider>
    </>
  );
}
