'use client';

import { ANNOUNCEMENT_TONES, PRODUCT_CODES, PRODUCTS, type PricedProduct, type ProductCode } from '@cardai/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Megaphone, Pencil, Percent, Plus, Tag, Ticket, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Chip, Field, Input, Select } from '@/components/ui/field';
import { Badge, Empty, fromLocalInput, inr, num, PageHeader, Segmented, shortDate, Skeleton, Table, toDate, toLocalInput, Toggle } from '@/features/admin/ui';
import { api, ApiError } from '@/lib/api';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  kind: 'percent' | 'flat';
  value: number;
  productCodes: ProductCode[];
  startsAt: string | null;
  endsAt: string | null;
  maxUses: number | null;
  perUserLimit: number;
  usedCount: number;
  active: boolean;
}
interface Sale {
  id: string;
  name: string;
  percentOff: number;
  productCodes: ProductCode[];
  startsAt: string;
  endsAt: string;
  active: boolean;
}
interface Banner {
  id: string;
  message: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  tone: (typeof ANNOUNCEMENT_TONES)[number];
  audience: 'all' | 'landing' | 'app';
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
}
type PriceRow = PricedProduct & { override: { pricePaise: number | null; mrpPaise: number | null } | null };

type Tab = 'coupons' | 'sales' | 'banners' | 'prices';

function liveState(o: { active: boolean; startsAt: string | null; endsAt: string | null }): { label: string; tone: 'good' | 'warn' | 'neutral' | 'bad' } {
  const now = Date.now();
  const s = toDate(o.startsAt)?.getTime();
  const e = toDate(o.endsAt)?.getTime();
  if (!o.active) return { label: 'Paused', tone: 'neutral' };
  if (e && e < now) return { label: 'Ended', tone: 'bad' };
  if (s && s > now) return { label: `Starts ${shortDate(o.startsAt)}`, tone: 'warn' };
  return { label: 'Live', tone: 'good' };
}

const productNames = (codes: ProductCode[]) => (codes.length ? codes.map((c) => PRODUCTS[c]?.name ?? c).join(', ') : 'All products');

async function call<T>(p: Promise<T>, ok: string) {
  try {
    const r = await p;
    toast.success(ok);
    return r;
  } catch (e) {
    toast.error(e instanceof ApiError ? e.message : 'Something went wrong');
    throw e;
  }
}

export default function AdminOffersPage() {
  const [tab, setTab] = useState<Tab>('coupons');
  return (
    <>
      <PageHeader title="Offers & pricing" description="Launch coupon codes and sitewide sales, schedule banners, and change product prices. Changes go live within a minute." />
      <div className="mb-5">
        <Segmented
          value={tab}
          onChange={setTab}
          label="Offer type"
          options={[
            { value: 'coupons', label: 'Coupon codes' },
            { value: 'sales', label: 'Sitewide sales' },
            { value: 'banners', label: 'Banners' },
            { value: 'prices', label: 'Prices' },
          ]}
        />
      </div>
      {tab === 'coupons' && <Coupons />}
      {tab === 'sales' && <Sales />}
      {tab === 'banners' && <Banners />}
      {tab === 'prices' && <Prices />}
    </>
  );
}

function SectionCard({ title, description, action, children }: { title: string; description: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-hairline bg-surface">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="font-sans text-base font-bold">{title}</h2>
          <p className="text-sm text-ink-soft">{description}</p>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function ProductPicker({ value, onChange }: { value: ProductCode[]; onChange: (v: ProductCode[]) => void }) {
  return (
    <div>
      <p className="mb-2 text-[0.95rem] font-semibold">Applies to</p>
      <div className="flex flex-wrap gap-2">
        <Chip selected={!value.length} onClick={() => onChange([])} className="h-9 text-sm">
          All products
        </Chip>
        {PRODUCT_CODES.map((c) => (
          <Chip key={c} selected={value.includes(c)} onClick={() => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c])} className="h-9 text-sm">
            {PRODUCTS[c].name}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function DateRange({ start, end, onStart, onEnd, required }: { start: string; end: string; onStart: (v: string) => void; onEnd: (v: string) => void; required?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={required ? 'Starts' : 'Starts (optional)'}>{(id) => <Input id={id} type="datetime-local" value={start} onChange={(e) => onStart(e.target.value)} required={required} />}</Field>
      <Field label={required ? 'Ends' : 'Ends (optional)'}>{(id) => <Input id={id} type="datetime-local" value={end} onChange={(e) => onEnd(e.target.value)} required={required} />}</Field>
    </div>
  );
}

// ---------------- Coupons ----------------

function Coupons() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'coupons'], queryFn: () => api<Coupon[]>('/admin/coupons') });
  const [editing, setEditing] = useState<Coupon | 'new' | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });

  return (
    <SectionCard
      title="Coupon codes"
      description="Customers type the code at checkout. Coupons stack on top of a running sale."
      action={
        <Button size="sm" variant="solid" onClick={() => setEditing('new')}>
          <Plus className="size-4" /> New coupon
        </Button>
      }
    >
      {isLoading ? (
        <Skeleton className="m-5 h-32" />
      ) : !data?.length ? (
        <div className="px-5 pb-5">
          <Empty icon={<Ticket className="size-6" />} title="No coupons yet">
            Create one like DIWALI20 for 20% off, or FLAT100 for ₹100 off.
          </Empty>
        </div>
      ) : (
        <Table head={['Code', 'Discount', 'Products', 'Used', 'Valid', 'Status', '']}>
          {data.map((c) => {
            const st = liveState(c);
            return (
              <tr key={c.id}>
                <td>
                  <p className="font-mono font-bold tracking-wide">{c.code}</p>
                  {c.description && <p className="text-xs text-ink-soft">{c.description}</p>}
                </td>
                <td className="font-semibold">{c.kind === 'percent' ? `${c.value}% off` : `${inr(c.value)} off`}</td>
                <td className="max-w-48 truncate text-ink-soft" title={productNames(c.productCodes)}>
                  {productNames(c.productCodes)}
                </td>
                <td className="tabular-nums">
                  {num(c.usedCount)}
                  {c.maxUses ? ` / ${num(c.maxUses)}` : ''}
                </td>
                <td className="whitespace-nowrap text-ink-soft">{c.endsAt ? `Until ${shortDate(c.endsAt)}` : 'No end date'}</td>
                <td>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </td>
                <td>
                  <RowActions
                    active={c.active}
                    onToggle={(active) => void call(api(`/admin/coupons/${c.id}`, { method: 'PUT', json: couponBody({ ...c, active }) }), active ? 'Coupon activated' : 'Coupon paused').then(refresh)}
                    onEdit={() => setEditing(c)}
                    onDelete={() => confirm(`Delete coupon ${c.code}?`) && void call(api(`/admin/coupons/${c.id}`, { method: 'DELETE' }), 'Coupon deleted').then(refresh)}
                  />
                </td>
              </tr>
            );
          })}
        </Table>
      )}
      {editing && <CouponDialog coupon={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </SectionCard>
  );
}

function couponBody(c: Omit<Coupon, 'id' | 'usedCount'>) {
  return {
    code: c.code,
    description: c.description || null,
    kind: c.kind,
    value: c.value,
    productCodes: c.productCodes,
    startsAt: c.startsAt ? toDate(c.startsAt)!.toISOString() : null,
    endsAt: c.endsAt ? toDate(c.endsAt)!.toISOString() : null,
    maxUses: c.maxUses,
    perUserLimit: c.perUserLimit,
    active: c.active,
  };
}

function CouponDialog({ coupon, onClose, onSaved }: { coupon: Coupon | null; onClose: () => void; onSaved: () => void }) {
  const [code, setCode] = useState(coupon?.code ?? '');
  const [description, setDescription] = useState(coupon?.description ?? '');
  const [kind, setKind] = useState<'percent' | 'flat'>(coupon?.kind ?? 'percent');
  const [value, setValue] = useState(coupon ? String(coupon.kind === 'flat' ? coupon.value / 100 : coupon.value) : '20');
  const [products, setProducts] = useState<ProductCode[]>(coupon?.productCodes ?? []);
  const [start, setStart] = useState(toLocalInput(coupon?.startsAt));
  const [end, setEnd] = useState(toLocalInput(coupon?.endsAt));
  const [maxUses, setMaxUses] = useState(coupon?.maxUses ? String(coupon.maxUses) : '');
  const [perUser, setPerUser] = useState(String(coupon?.perUserLimit ?? 1));
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(value);
    const body = {
      code: code.trim().toUpperCase(),
      description: description.trim() || null,
      kind,
      value: kind === 'flat' ? Math.round(v * 100) : Math.round(v),
      productCodes: products,
      startsAt: fromLocalInput(start),
      endsAt: fromLocalInput(end),
      maxUses: maxUses ? Number(maxUses) : null,
      perUserLimit: Number(perUser) || 1,
      active: coupon?.active ?? true,
    };
    setBusy(true);
    try {
      await call(api(coupon ? `/admin/coupons/${coupon.id}` : '/admin/coupons', { method: coupon ? 'PUT' : 'POST', json: body }), coupon ? 'Coupon saved' : `Coupon ${body.code} is live`);
      onSaved();
      onClose();
    } catch {
      /* toast shown */
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={coupon ? `Edit ${coupon.code}` : 'New coupon'}>
      <form onSubmit={(e) => void save(e)} className="flex flex-col gap-4">
        <Field label="Code" hint="What customers type, e.g. DIWALI20">
          {(id, d) => <Input id={id} aria-describedby={d} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} required minLength={3} maxLength={24} className="font-mono uppercase tracking-wide" />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            {(id) => (
              <Select id={id} value={kind} onChange={(e) => setKind(e.target.value as 'percent' | 'flat')}>
                <option value="percent">% off</option>
                <option value="flat">₹ off</option>
              </Select>
            )}
          </Field>
          <Field label={kind === 'percent' ? 'Percent off' : 'Rupees off'}>
            {(id) => <Input id={id} type="number" min={1} max={kind === 'percent' ? 90 : 100000} step={1} value={value} onChange={(e) => setValue(e.target.value)} required />}
          </Field>
        </div>
        <ProductPicker value={products} onChange={setProducts} />
        <DateRange start={start} end={end} onStart={setStart} onEnd={setEnd} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Total uses (optional)" hint="Blank = unlimited">
            {(id, d) => <Input id={id} aria-describedby={d} type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />}
          </Field>
          <Field label="Uses per customer">{(id) => <Input id={id} type="number" min={1} max={100} value={perUser} onChange={(e) => setPerUser(e.target.value)} />}</Field>
        </div>
        <Field label="Note (optional)" hint="Shown to the customer when the code is applied">
          {(id, d) => <Input id={id} aria-describedby={d} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />}
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="line" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="solid" size="sm" loading={busy}>
            {coupon ? 'Save' : 'Create coupon'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ---------------- Sales ----------------

function Sales() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'sales'], queryFn: () => api<Sale[]>('/admin/sales') });
  const [editing, setEditing] = useState<Sale | 'new' | null>(null);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'sales'] });
    void qc.invalidateQueries({ queryKey: ['offers'] });
  };
  const body = (s: Sale) => ({ name: s.name, percentOff: s.percentOff, productCodes: s.productCodes, startsAt: toDate(s.startsAt)!.toISOString(), endsAt: toDate(s.endsAt)!.toISOString(), active: s.active });

  return (
    <SectionCard
      title="Sitewide sales"
      description="Automatic % off for a date range, shown with a strike-through price on pricing and checkout. If two overlap, the bigger discount wins."
      action={
        <Button size="sm" variant="solid" onClick={() => setEditing('new')}>
          <Plus className="size-4" /> New sale
        </Button>
      }
    >
      {isLoading ? (
        <Skeleton className="m-5 h-32" />
      ) : !data?.length ? (
        <div className="px-5 pb-5">
          <Empty icon={<Percent className="size-6" />} title="No sales yet">
            Plan one for Diwali, the wedding season or Valentine’s week.
          </Empty>
        </div>
      ) : (
        <Table head={['Sale', 'Discount', 'Products', 'Runs', 'Status', '']}>
          {data.map((s) => {
            const st = liveState(s);
            return (
              <tr key={s.id}>
                <td className="font-semibold">{s.name}</td>
                <td className="font-semibold">{s.percentOff}% off</td>
                <td className="max-w-48 truncate text-ink-soft">{productNames(s.productCodes)}</td>
                <td className="whitespace-nowrap text-ink-soft">
                  {shortDate(s.startsAt)} → {shortDate(s.endsAt)}
                </td>
                <td>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </td>
                <td>
                  <RowActions
                    active={s.active}
                    onToggle={(active) => void call(api(`/admin/sales/${s.id}`, { method: 'PUT', json: body({ ...s, active }) }), active ? 'Sale activated' : 'Sale paused').then(refresh)}
                    onEdit={() => setEditing(s)}
                    onDelete={() => confirm(`Delete “${s.name}”?`) && void call(api(`/admin/sales/${s.id}`, { method: 'DELETE' }), 'Sale deleted').then(refresh)}
                  />
                </td>
              </tr>
            );
          })}
        </Table>
      )}
      {editing && <SaleDialog sale={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </SectionCard>
  );
}

function SaleDialog({ sale, onClose, onSaved }: { sale: Sale | null; onClose: () => void; onSaved: () => void }) {
  const now = new Date();
  const [name, setName] = useState(sale?.name ?? '');
  const [percent, setPercent] = useState(String(sale?.percentOff ?? 20));
  const [products, setProducts] = useState<ProductCode[]>(sale?.productCodes ?? []);
  const [start, setStart] = useState(toLocalInput(sale?.startsAt ?? now));
  const [end, setEnd] = useState(toLocalInput(sale?.endsAt ?? new Date(now.getTime() + 7 * 86400_000)));
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await call(
        api(sale ? `/admin/sales/${sale.id}` : '/admin/sales', {
          method: sale ? 'PUT' : 'POST',
          json: { name: name.trim(), percentOff: Number(percent), productCodes: products, startsAt: fromLocalInput(start), endsAt: fromLocalInput(end), active: sale?.active ?? true },
        }),
        sale ? 'Sale saved' : 'Sale scheduled',
      );
      onSaved();
      onClose();
    } catch {
      /* toast shown */
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={sale ? 'Edit sale' : 'New sitewide sale'}>
      <form onSubmit={(e) => void save(e)} className="flex flex-col gap-4">
        <Field label="Name" hint="Shown to customers, e.g. “Diwali sale”">
          {(id, d) => <Input id={id} aria-describedby={d} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} />}
        </Field>
        <Field label="Percent off">{(id) => <Input id={id} type="number" min={1} max={90} value={percent} onChange={(e) => setPercent(e.target.value)} required />}</Field>
        <ProductPicker value={products} onChange={setProducts} />
        <DateRange start={start} end={end} onStart={setStart} onEnd={setEnd} required />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="line" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="solid" size="sm" loading={busy}>
            {sale ? 'Save' : 'Schedule sale'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ---------------- Banners ----------------

const TONE_CLASS = { marigold: 'bg-marigold text-[#1a1300]', indigo: 'bg-[#1e2250] text-white', sindoor: 'bg-[#b5121b] text-white' } as const;

function Banners() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'announcements'], queryFn: () => api<Banner[]>('/admin/announcements') });
  const [editing, setEditing] = useState<Banner | 'new' | null>(null);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'announcements'] });
    void qc.invalidateQueries({ queryKey: ['offers'] });
  };
  const body = (b: Banner) => ({ ...b, id: undefined, startsAt: b.startsAt ? toDate(b.startsAt)!.toISOString() : null, endsAt: b.endsAt ? toDate(b.endsAt)!.toISOString() : null });

  return (
    <SectionCard
      title="Announcement banners"
      description="A strip across the top of the site. Visitors can close it; the newest live banner shows first."
      action={
        <Button size="sm" variant="solid" onClick={() => setEditing('new')}>
          <Plus className="size-4" /> New banner
        </Button>
      }
    >
      {isLoading ? (
        <Skeleton className="m-5 h-32" />
      ) : !data?.length ? (
        <div className="px-5 pb-5">
          <Empty icon={<Megaphone className="size-6" />} title="No banners yet">
            Announce a sale, a new template collection or a festival offer.
          </Empty>
        </div>
      ) : (
        <ul className="flex flex-col gap-3 px-5 pb-5">
          {data.map((b) => {
            const st = liveState(b);
            return (
              <li key={b.id} className="overflow-hidden rounded-xl border border-hairline">
                <div className={clsx('px-4 py-2 text-center text-sm font-semibold', TONE_CLASS[b.tone])}>
                  {b.message} {b.ctaLabel && <span className="underline underline-offset-4">{b.ctaLabel}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                  <Badge tone={st.tone}>{st.label}</Badge>
                  <span className="text-ink-soft">{b.audience === 'all' ? 'Whole site' : b.audience === 'landing' ? 'Home page only' : 'App pages only'}</span>
                  {b.endsAt && <span className="text-ink-soft">· until {shortDate(b.endsAt)}</span>}
                  <span className="flex-1" />
                  <RowActions
                    active={b.active}
                    onToggle={(active) => void call(api(`/admin/announcements/${b.id}`, { method: 'PUT', json: body({ ...b, active }) }), active ? 'Banner on' : 'Banner off').then(refresh)}
                    onEdit={() => setEditing(b)}
                    onDelete={() => confirm('Delete this banner?') && void call(api(`/admin/announcements/${b.id}`, { method: 'DELETE' }), 'Banner deleted').then(refresh)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {editing && <BannerDialog banner={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </SectionCard>
  );
}

function BannerDialog({ banner, onClose, onSaved }: { banner: Banner | null; onClose: () => void; onSaved: () => void }) {
  const [message, setMessage] = useState(banner?.message ?? '');
  const [ctaLabel, setCtaLabel] = useState(banner?.ctaLabel ?? '');
  const [ctaUrl, setCtaUrl] = useState(banner?.ctaUrl ?? '/pricing');
  const [tone, setTone] = useState<Banner['tone']>(banner?.tone ?? 'marigold');
  const [audience, setAudience] = useState<Banner['audience']>(banner?.audience ?? 'all');
  const [start, setStart] = useState(toLocalInput(banner?.startsAt));
  const [end, setEnd] = useState(toLocalInput(banner?.endsAt));
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await call(
        api(banner ? `/admin/announcements/${banner.id}` : '/admin/announcements', {
          method: banner ? 'PUT' : 'POST',
          json: {
            message: message.trim(),
            ctaLabel: ctaLabel.trim() || null,
            ctaUrl: ctaLabel.trim() && ctaUrl.trim() ? ctaUrl.trim() : null,
            tone,
            audience,
            startsAt: fromLocalInput(start),
            endsAt: fromLocalInput(end),
            active: banner?.active ?? true,
          },
        }),
        banner ? 'Banner saved' : 'Banner published',
      );
      onSaved();
      onClose();
    } catch {
      /* toast shown */
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={banner ? 'Edit banner' : 'New banner'}>
      <form onSubmit={(e) => void save(e)} className="flex flex-col gap-4">
        <div className={clsx('rounded-xl px-4 py-2 text-center text-sm font-semibold', TONE_CLASS[tone])}>
          {message || 'Your message appears here'} {ctaLabel && <span className="underline underline-offset-4">{ctaLabel}</span>}
        </div>
        <Field label="Message">{(id) => <Input id={id} value={message} onChange={(e) => setMessage(e.target.value)} required minLength={3} maxLength={160} placeholder="Diwali sale: 25% off every video invite" />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Button text (optional)">{(id) => <Input id={id} value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} maxLength={30} placeholder="See offer" />}</Field>
          <Field label="Button link" hint="/pricing or https://…">
            {(id, d) => <Input id={id} aria-describedby={d} value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} maxLength={300} />}
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Colour">
            {(id) => (
              <Select id={id} value={tone} onChange={(e) => setTone(e.target.value as Banner['tone'])}>
                <option value="marigold">Marigold</option>
                <option value="indigo">Indigo</option>
                <option value="sindoor">Sindoor red</option>
              </Select>
            )}
          </Field>
          <Field label="Show on">
            {(id) => (
              <Select id={id} value={audience} onChange={(e) => setAudience(e.target.value as Banner['audience'])}>
                <option value="all">Whole site</option>
                <option value="landing">Home page only</option>
                <option value="app">App pages only</option>
              </Select>
            )}
          </Field>
        </div>
        <DateRange start={start} end={end} onStart={setStart} onEnd={setEnd} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="line" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="solid" size="sm" loading={busy}>
            {banner ? 'Save' : 'Publish banner'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ---------------- Prices ----------------

function Prices() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'prices'], queryFn: () => api<PriceRow[]>('/admin/prices') });
  const [editing, setEditing] = useState<PriceRow | null>(null);

  return (
    <SectionCard title="Product prices" description="The price customers pay before sales and coupons. MRP is the crossed-out price.">
      {isLoading || !data ? (
        <Skeleton className="m-5 h-48" />
      ) : (
        <Table head={['Product', 'Price', 'MRP', 'With current sale', '']}>
          {data.map((p) => (
            <tr key={p.code}>
              <td>
                <p className="font-semibold">{p.name}</p>
                <p className="max-w-sm truncate text-xs text-ink-soft">{p.description}</p>
              </td>
              <td className="whitespace-nowrap">
                <span className="font-semibold tabular-nums">{inr(p.basePricePaise)}</span>
                {p.override?.pricePaise != null && (
                  <span className="ml-2">
                    <Badge tone="info">Edited · was {inr(PRODUCTS[p.code].pricePaise)}</Badge>
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap tabular-nums text-ink-soft">{p.override?.mrpPaise ?? PRODUCTS[p.code].mrpPaise ? inr((p.override?.mrpPaise ?? PRODUCTS[p.code].mrpPaise)!) : '—'}</td>
              <td className="whitespace-nowrap">{p.sale ? <span className="font-semibold text-leaf">{inr(p.pricePaise)} · {p.sale.percentOff}% off</span> : <span className="text-ink-soft">No sale</span>}</td>
              <td className="text-right">
                <Button size="sm" variant="line" className="h-8 px-3" onClick={() => setEditing(p)}>
                  <Pencil className="size-3.5" /> Edit
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {editing && <PriceDialog p={editing} onClose={() => setEditing(null)} onSaved={(rows) => {
        qc.setQueryData(['admin', 'prices'], rows);
        void qc.invalidateQueries({ queryKey: ['offers'] });
      }} />}
    </SectionCard>
  );
}

function PriceDialog({ p, onClose, onSaved }: { p: PriceRow; onClose: () => void; onSaved: (rows: PriceRow[]) => void }) {
  const def = PRODUCTS[p.code];
  const [price, setPrice] = useState(String(p.basePricePaise / 100));
  const [mrp, setMrp] = useState(String(((p.override?.mrpPaise ?? def.mrpPaise) ?? 0) / 100 || ''));
  const [busy, setBusy] = useState(false);

  async function save(reset = false) {
    setBusy(true);
    try {
      const pricePaise = reset ? null : Math.round(Number(price) * 100);
      const mrpPaise = reset || !mrp ? null : Math.round(Number(mrp) * 100);
      const rows = await call(
        api<PriceRow[]>(`/admin/prices/${p.code}`, {
          method: 'PUT',
          json: { pricePaise: pricePaise === def.pricePaise ? null : pricePaise, mrpPaise: mrpPaise === (def.mrpPaise ?? null) ? null : mrpPaise },
        }),
        reset ? 'Back to the default price' : `${p.name} price updated`,
      );
      onSaved(rows);
      onClose();
    } catch {
      /* toast shown */
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={`Price: ${p.name}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (₹)" hint={`Default ${inr(def.pricePaise)}`}>
            {(id, d) => <Input id={id} aria-describedby={d} type="number" min={1} step={1} value={price} onChange={(e) => setPrice(e.target.value)} required />}
          </Field>
          <Field label="MRP (₹, optional)" hint={def.mrpPaise ? `Default ${inr(def.mrpPaise)}` : 'Crossed-out price'}>
            {(id, d) => <Input id={id} aria-describedby={d} type="number" min={1} step={1} value={mrp} onChange={(e) => setMrp(e.target.value)} />}
          </Field>
        </div>
        <p className="flex items-center gap-2 rounded-xl bg-mist px-3 py-2 text-sm text-ink-soft">
          <Tag className="size-4" /> Existing paid orders keep the price they were bought at.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          {p.override && (
            <Button type="button" variant="quiet" size="sm" onClick={() => void save(true)} disabled={busy}>
              Reset to default
            </Button>
          )}
          <Button type="button" variant="line" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="solid" size="sm" loading={busy}>
            Save price
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function RowActions({ active, onToggle, onEdit, onDelete }: { active: boolean; onToggle: (v: boolean) => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Toggle checked={active} onChange={onToggle} label={active ? 'Pause' : 'Activate'} />
      <button type="button" onClick={onEdit} aria-label="Edit" data-tip="Edit" className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-mist hover:text-ink">
        <Pencil className="size-4" />
      </button>
      <button type="button" onClick={onDelete} aria-label="Delete" data-tip="Delete" className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-sindoor/10 hover:text-sindoor">
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
