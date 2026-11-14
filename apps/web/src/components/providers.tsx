'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { TooltipLayer } from '@/components/ui/tooltip';
import { ApiError } from '@/lib/api';
import { ThemeSync } from '@/lib/theme';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <ThemeSync />
      <TooltipLayer />
      {children}
      <Toaster
        position="top-center"
        closeButton
        toastOptions={{ className: '!rounded-2xl !border !border-hairline !bg-surface !text-ink !shadow-lg' }}
      />
    </QueryClientProvider>
  );
}
