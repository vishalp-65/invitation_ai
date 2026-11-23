import { Logo } from '@/components/layout/logo';
import { ButtonLink } from '@/components/ui/button';

export default function NotFound() {
  // Rendered by the lean root layout (also for unknown invitation links): a light page with no
  // app header, so a 404 costs guests almost nothing to load.
  return (
    <>
      <header className="flex justify-center px-5 pt-8">
        <Logo />
      </header>
      <div className="toran animate-sway" aria-hidden />
      <main id="main" className="mx-auto flex max-w-xl flex-col items-center px-5 py-20 text-center sm:py-28">
        <p className="animate-fade-up font-display text-7xl text-primary sm:text-8xl">404</p>
        <h1 className="mt-4 animate-fade-up text-[2rem] [animation-delay:80ms] sm:text-[2.75rem]">This page does not exist</h1>
        <p className="mt-4 animate-fade-up text-lg text-ink-soft [animation-delay:160ms]">
          If someone sent you an invitation link, it may have been unpublished. Ask them to share it again.
        </p>
        <div className="mt-8 flex animate-fade-up flex-col gap-3 [animation-delay:240ms] sm:flex-row">
          <ButtonLink href="/" size="lg">
            Go to the home page
          </ButtonLink>
          <ButtonLink href="/templates" variant="line" size="lg">
            Browse designs
          </ButtonLink>
        </div>
      </main>
    </>
  );
}
