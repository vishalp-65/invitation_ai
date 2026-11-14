import { SiteHeader } from '@/components/layout/site-header';
import { ButtonLink } from '@/components/ui/button';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-5xl">This page does not exist</h1>
        <p className="mt-4 text-lg text-ink-soft">
          If someone sent you an invitation link, it may have been unpublished. Ask them to share it again.
        </p>
        <ButtonLink href="/" className="mt-8">
          Go to the home page
        </ButtonLink>
      </main>
    </>
  );
}
