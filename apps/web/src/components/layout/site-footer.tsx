import { BRAND } from '@cardai/shared';
import { clsx } from 'clsx';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { ArtImage } from '@/components/studio/primitives';
import { Logo } from './logo';

/** Site footer. A server component: plain links, so it adds no client JavaScript. */
export function SiteFooter({ banner = false }: { banner?: boolean } = {}) {
  return (
    <footer className="relative bg-black text-white [color-scheme:dark]">
      {/* Panoramic art banner (home page). Drop /landing/footer-panorama.jpg in to replace the glow. */}
      {banner && (
        <div className="art-wrap-all relative h-[240px] w-full overflow-clip sm:h-[300px] md:h-[420px]">
          <ArtImage name="footer-panorama" collapse className="parallax-slow absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
        </div>
      )}
      <div
        className={clsx(
          'relative z-10 mx-auto max-w-[1400px] px-5 sm:px-6 lg:px-12',
          banner && 'pb-24 lg:pb-0',
        )}
      >
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 py-14 sm:grid-cols-4 lg:grid-cols-6 lg:gap-8 lg:py-20">
          <div className="col-span-2 sm:col-span-4 lg:col-span-2">
            <Logo tone="light" />
            <p className="mb-8 mt-6 max-w-xs text-sm leading-relaxed text-white/50">
              Invitation cards, video invites and invitation websites for every Indian family
              occasion, in your language.
            </p>
            <a
              href="https://wa.me/910000000000?text=Hi"
              target="_blank"
              rel="noopener"
              className="group flex w-fit items-center gap-1 text-sm text-white/40 transition-colors hover:text-white"
            >
              WhatsApp
              <ArrowUpRight className="size-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
            </a>
          </div>
          <FooterCol
            title="Make"
            links={[
              ['/create', 'Make an invitation'],
              ['/templates', 'Designs'],
              ['/pricing', 'Pricing'],
            ]}
          />
          <FooterCol
            title="Occasions"
            links={[
              ['/wedding-invitation', 'Wedding invitations'],
              ['/engagement-invitation', 'Engagement invitations'],
              ['/griha-pravesh-invitation', 'Griha pravesh invitations'],
              ['/birthday-invitation', 'Birthday invitations'],
              ['/nikah-invitation', 'Nikah invitations'],
              ['/puja-invitation', 'Puja invitations'],
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              ['/designer', 'Sell your designs', 'Open'],
              ['/login', 'Log in'],
              ['/signup', 'Sign up'],
            ]}
          />
          <FooterCol
            title="Help"
            links={[
              ['/#pricing', 'Plans'],
              ['/#privacy', 'Privacy'],
              ['/#faq', 'FAQ'],
            ]}
          />
        </div>
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 py-8 md:flex-row">
          <p className="text-sm text-white/30">
            © {new Date().getFullYear()} {BRAND.name}. Made in India, for every family.
          </p>
          <span className="flex items-center gap-2 text-sm text-white/30">
            <span className="size-2 rounded-full bg-rose" />
            Invites delivering
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<[string, string, string?]> }) {
  return (
    <div>
      <h3 className="mb-6 text-sm font-medium text-white">{title}</h3>
      <ul className="flex flex-col gap-4">
        {links.map(([href, label, badge]) => (
          <li key={href}>
            <Link
              href={href}
              className="inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white"
            >
              {label}
              {badge && (
                <span className="rounded-full bg-white px-2 py-0.5 text-xs text-black">
                  {badge}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
