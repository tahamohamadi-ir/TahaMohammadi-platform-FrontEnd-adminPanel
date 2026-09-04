import type { components } from '@/generated/admin-api'
import { adminFetch } from '@/lib/api/client'
import { adminJson } from '@/lib/api/auth'

export type MediaItemOut = components['schemas']['MediaItemOut']
export type MediaListOut = components['schemas']['MediaListOut']
export type MediaUpdateIn = components['schemas']['MediaUpdateIn']

export interface MediaListParams {
  q?: string
  type?: string
  active?: string
  page?: number
  pageSize?: number
}

export function mediaListPath(params: MediaListParams = {}): string {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.type) search.set('type', params.type)
  if (params.active) search.set('active', params.active)
  if (params.page !== undefined) search.set('page', String(params.page))
  if (params.pageSize !== undefined) {
    search.set('pageSize', String(params.pageSize))
  }
  const query = search.toString()
  return `/media${query ? `?${query}` : ''}`
}

export async function fetchMediaList(
  params: MediaListParams = {},
): Promise<MediaListOut> {
  return adminJson<MediaListOut>(mediaListPath(params))
}

/** Multipart upload; the browser sets the Content-Type boundary, so no
 * explicit Content-Type header is sent. */
export async function uploadMedia(payload: {
  file: File
  title?: string
  altTextEn?: string
  altTextFa?: string
}): Promise<MediaItemOut> {
  const formData = new FormData()
  formData.append('file', payload.file)
  if (payload.title) formData.append('title', payload.title)
  if (payload.altTextEn) formData.append('altTextEn', payload.altTextEn)
  if (payload.altTextFa) formData.append('altTextFa', payload.altTextFa)
  return adminJson<MediaItemOut>('/media', { method: 'POST', body: formData })
}

export async function updateMediaMetadata(
  mediaId: number,
  payload: MediaUpdateIn,
  ifMatch: string,
): Promise<MediaItemOut> {
  return adminJson<MediaItemOut>(`/media/${mediaId}`, {
    method: 'PUT',
    headers: { 'If-Match': ifMatch, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/** Blocked by the backend with 409 MEDIA_IN_USE while content references it. */
export async function deleteMedia(mediaId: number): Promise<void> {
  return adminJson<void>(`/media/${mediaId}`, { method: 'DELETE' })
}

export async function fetchMediaItem(mediaId: number): Promise<MediaItemOut> {
  return adminJson<MediaItemOut>(`/media/${mediaId}`)
}

/** Re-exported fetcher for callers needing the raw client (none today). */
export { adminFetch }
