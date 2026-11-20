import { ADMIN_SCOPES, type AdminScope } from '@cardai/shared';

export function effectiveScopes(raw: unknown): AdminScope[] {
  const list = Array.isArray(raw) ? raw.filter((s): s is AdminScope => (ADMIN_SCOPES as readonly string[]).includes(s)) : [];
  return list.length ? list : ['owner'];
}

export function hasScope(scopes: AdminScope[], needed: AdminScope[]): boolean {
  return scopes.includes('owner') || needed.some((s) => scopes.includes(s));
}
