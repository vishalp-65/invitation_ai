'use client';

import { EVENT_TYPE_IDS, getEventType, type EventDto, type EventTypeId } from '@cardai/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Crown, Loader2, Store } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/dialog';
import { Chip, controlClass } from '@/components/ui/field';
import { api, ApiError } from '@/lib/api';
import { useEditor } from './store';

/**
 * Admin only: publish the design on the canvas as a catalogue template every customer can pick.
 * Text stays bound to invitation fields, so names, dates and venues fill in per customer.
 */
export function PublishTemplateDialog({ onClose, event }: { onClose: () => void; event: EventDto }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [name, setName] = useState('');
  const [types, setTypes] = useState<EventTypeId[]>(EVENT_TYPE_IDS.includes(event.type as EventTypeId) ? [event.type as EventTypeId] : []);
  const [tags, setTags] = useState('');
  const [premium, setPremium] = useState(false);
  const [busy, setBusy] = useState(false);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    const design = useEditor.getState().doc;
    if (!design) return;
    setBusy(true);
    try {
      const res = await api<{ id: string; name: string }>('/admin/catalog', {
        method: 'POST',
        json: {
          name: name.trim(),
          baseTemplateId: event.templateId,
          eventTypes: types,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 12),
          premium,
          design,
        },
      });
      void qc.invalidateQueries({ queryKey: ['templates'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'catalog'] });
      toast.success(`“${res.name}” is live in the catalogue`, { action: { label: 'Manage', onClick: () => router.push('/admin/templates') } });
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not publish. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Publish to catalogue">
      <form onSubmit={(e) => void publish(e)} className="flex flex-col gap-4 pb-2">
        <p className="rounded-xl bg-marigold/15 px-3 py-2 text-sm">
          Every customer will be able to pick this design. Photos are removed; text linked to invitation details fills in for each customer.
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink-soft">Template name</span>
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} required minLength={2} placeholder="e.g. Marigold Arch · Maroon" className={`${controlClass} h-10 px-3`} />
        </label>
        <div>
          <p className="mb-2 text-sm font-semibold text-ink-soft">Suits these occasions</p>
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPE_IDS.map((id) => (
              <Chip key={id} selected={types.includes(id)} onClick={() => setTypes((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))} className="h-9 text-sm">
                {getEventType(id).label}
              </Chip>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink-soft">Search tags (comma separated)</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="royal, floral, maroon, ganesha" className={`${controlClass} h-10 px-3`} />
        </label>
        <label className="flex items-center gap-3 rounded-xl border border-hairline px-3 py-3">
          <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} className="size-5 accent-[var(--color-primary)]" />
          <span className="flex-1">
            <span className="flex items-center gap-1.5 font-semibold">
              <Crown className="size-4 text-marigold" /> Premium template
            </span>
            <span className="text-sm text-ink-soft">Shown with the Premium badge in the gallery.</span>
          </span>
        </label>
        <button type="submit" disabled={busy || !name.trim() || !types.length} className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-60">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Store className="size-4" />}
          Publish template
        </button>
        <Link href="/admin/templates" className="text-center text-sm font-semibold text-ink-soft underline underline-offset-4">
          Manage templates in the admin console
        </Link>
      </form>
    </Dialog>
  );
}
