import type { MediaAssetDto } from '@cardai/shared';
import { api } from './api';

/** Presigned upload straight to storage, then confirm with the API. */
export async function uploadPhoto(eventId: string, file: File): Promise<MediaAssetDto> {
  const type = file.type as 'image/jpeg' | 'image/png' | 'image/webp';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) throw new Error('Use a JPG, PNG or WebP photo');
  const { assetId, uploadUrl, headers } = await api<{ assetId: string; uploadUrl: string; headers: Record<string, string> }>('/media/presign', {
    method: 'POST',
    json: { eventId, contentType: type, bytes: file.size },
  });
  const put = await fetch(uploadUrl, { method: 'PUT', headers, body: file });
  if (!put.ok) throw new Error('Upload failed. Check your connection and try again.');
  return api<MediaAssetDto>(`/media/${assetId}/complete`, { method: 'POST' });
}
