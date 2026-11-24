'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ErrorReporter } from '@/components/error-reporter';
import { SystemBars } from '@/components/layout/system-bars';
import { Tracker } from '@/components/tracker';
import { ConfirmLayer } from '@/components/ui/confirm';
import { TooltipLayer } from '@/components/ui/tooltip';
import { ValidationLayer } from '@/components/ui/validation-layer';
import { ApiError, startSessionKeeper } from '@/lib/api';
import { qk } from '@/lib/hooks';
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
  useEffect(() => startSessionKeeper(() => !!client.getQueryData(qk.me)), [client]);
  return (
    <QueryClientProvider client={client}>
      <ThemeSync />
      <ErrorReporter />
      <TooltipLayer />
      <ConfirmLayer />
      <ValidationLayer />
      <Tracker />
      <SystemBars />
      {children}
      <Toaster
        position="top-center"
        closeButton
        toastOptions={{ className: '!rounded-xl !border !border-hairline !bg-surface !text-ink' }}
      />
    </QueryClientProvider>
  );
}
