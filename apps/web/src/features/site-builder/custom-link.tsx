'use client';

import { ALIAS_MIN, aliasProblem, ALIAS_PROBLEM_TEXT, normaliseAlias, tierAtLeast, type SiteSettingsDto } from '@cardai/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Crown, Link2, Loader2, Share2, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import { useMe } from '@/lib/hooks';

interface AliasCheck {
  alias: string;
  available: boolean;
  reason: string | null;
  suggestions: string[];
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const hostOf = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/[^/]*$/, '');

/**
 * "Your link" card: the live link, plus a custom name (`noyta.in/rp`). Names are 2–32
 * characters, checked as the host types; taken names come back with free suggestions.
 * Custom names are Site Premium (admins always).
 */
export function CustomLink({ eventId, settings, onUpgrade }: { eventId: string; settings: SiteSettingsDto; onUpgrade: () => void }) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const allowed = tierAtLeast(settings.tier, 'premium') || me?.role === 'admin';
  const current = settings.vanityAlias ?? '';
  const [draft, setDraft] = useState(current);
  const [editing, setEditing] = useState(false);
  const alias = normaliseAlias(draft).replace(/-+$/, '');
  const debounced = useDebounced(alias, 350);
  const local = aliasProblem(alias);
  const host = hostOf(settings.shortUrl);
  const liveUrl = settings.vanityUrl ?? settings.shortUrl;

  const check = useQuery({
    queryKey: ['site', eventId, 'alias-check', debounced],
    queryFn: () => api<AliasCheck>(`/events/${eventId}/site/alias/check?alias=${encodeURIComponent(debounced)}`),
    enabled: editing && debounced.length >= ALIAS_MIN && !aliasProblem(debounced) && debounced !== current,
    staleTime: 15_000,
  });
  const settled = debounced === alias && check.data?.alias === alias;
  const status: 'idle' | 'checking' | 'ok' | 'bad' =
    !alias || alias === current ? 'idle' : local ? 'bad' : !settled || check.isFetching ? 'checking' : check.data?.available ? 'ok' : 'bad';
  const reason = local ? ALIAS_PROBLEM_TEXT[local] : settled ? check.data?.reason : null;

  const refresh = () => qc.invalidateQueries({ queryKey: ['site', eventId] });
  const save = useMutation({
    mutationFn: (name: string) => api<{ vanityAlias: string; vanityUrl: string }>(`/events/${eventId}/site/alias`, { method: 'PUT', json: { alias: name } }),
    onSuccess: (r) => {
      toast.success(`Your link is ready: ${r.vanityUrl.replace(/^https?:\/\//, '')}`);
      setEditing(false);
      setDraft(r.vanityAlias);
      void refresh();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.requiredFeature) return onUpgrade();
      const s = err instanceof ApiError ? (err.details as { suggestions?: string[] } | undefined)?.suggestions : undefined;
      if (s?.length) qc.setQueryData(['site', eventId, 'alias-check', alias], { alias, available: false, reason: err.message, suggestions: s });
      toast.error((err as Error).message);
    },
  });
  const remove = useMutation({
    mutationFn: () => api(`/events/${eventId}/site/alias`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Custom link removed. Your short link still works.');
      setDraft('');
      void refresh();
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const copy = (url: string) => navigator.clipboard.writeText(url).then(() => toast.success('Link copied'));
  const share = async (url: string) => {
    if (navigator.share) await navigator.share({ url }).catch(() => undefined);
    else await copy(url);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* The link guests get */}
      <div className="rounded-[12px] border border-ink/10 p-3">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">Your invitation link</p>
        <div className="mt-1.5 flex items-center gap-2">
          <Link2 className="size-4 shrink-0 text-ink-soft" aria-hidden />
          <a href={liveUrl} target="_blank" rel="noopener" className="min-w-0 flex-1 truncate text-[15px] font-semibold underline-offset-4 hover:underline">
            {liveUrl.replace(/^https?:\/\//, '')}
          </a>
          <Button size="sm" variant="line" onClick={() => copy(liveUrl)} aria-label="Copy link">
            <Copy className="size-4" />
          </Button>
          <Button size="sm" variant="line" onClick={() => share(liveUrl)} aria-label="Share link">
            <Share2 className="size-4" />
          </Button>
        </div>
        {settings.vanityUrl && <p className="mt-1.5 text-xs text-ink-soft">The short link {settings.shortUrl.replace(/^https?:\/\//, '')} still works too.</p>}
      </div>

      {/* Custom name */}
      <div className="rounded-[12px] border border-ink/10 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Custom link</p>
          {!allowed && (
            <span className="badge inline-flex items-center gap-1">
              <Crown className="size-3" aria-hidden /> Premium
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-ink-soft">Pick a short name guests can type: from {ALIAS_MIN} letters, nothing added at the end.</p>

        {!editing && current ? (
          <div className="mt-2 flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm">
              {host}/<b>{current}</b>
            </span>
            <Button size="sm" variant="line" onClick={() => setEditing(true)}>
              Change
            </Button>
            <Button size="sm" variant="quiet" onClick={() => remove.mutate()} loading={remove.isPending} aria-label="Remove custom link">
              <Trash2 className="size-4" />
            </Button>
          </div>
        ) : (
          <form
            className="mt-2 flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!allowed) return onUpgrade();
              if (status === 'ok') save.mutate(alias);
            }}
          >
            <label className="flex h-11 items-center overflow-hidden rounded-[8px] border border-ink/15 focus-within:border-ink/40">
              <span className="select-none pl-3 text-sm text-ink-soft">{host}/</span>
              <input
                value={draft}
                maxLength={40}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="rahul-priya"
                aria-label="Custom link name"
                aria-invalid={status === 'bad'}
                aria-describedby="alias-status"
                onFocus={() => setEditing(true)}
                onChange={(e) => setDraft(normaliseAlias(e.target.value))}
                className="h-full min-w-0 flex-1 bg-transparent pr-2 text-sm font-semibold outline-none"
              />
              <span className="grid w-9 place-items-center" aria-hidden>
                {status === 'checking' && <Loader2 className="size-4 animate-spin text-ink-soft" />}
                {status === 'ok' && <Check className="size-4 text-emerald-600" />}
                {status === 'bad' && <X className="size-4 text-sindoor" />}
              </span>
            </label>
            <p id="alias-status" role="status" className={`min-h-4 text-xs ${status === 'bad' ? 'text-sindoor' : 'text-ink-soft'}`}>
              {status === 'ok' ? `${host}/${alias} is free` : status === 'bad' ? reason : status === 'checking' ? 'Checking…' : ''}
            </p>
            {status === 'bad' && settled && !!check.data?.suggestions.length && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-ink-soft">Free:</span>
                {check.data.suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => setDraft(s)} className="rounded-full border border-ink/15 px-2.5 py-0.5 text-xs font-medium hover:border-ink/40">
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={allowed && status !== 'ok'} loading={save.isPending}>
                {allowed ? 'Save link' : 'Unlock custom link'}
              </Button>
              {current && (
                <Button
                  type="button"
                  size="sm"
                  variant="quiet"
                  onClick={() => {
                    setEditing(false);
                    setDraft(current);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
