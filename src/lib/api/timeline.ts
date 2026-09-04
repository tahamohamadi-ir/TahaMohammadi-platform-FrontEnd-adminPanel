import type { components } from '@/generated/admin-api'
import { adminJson } from '@/lib/api/auth'

export type TimelineAdminOut = components['schemas']['TimelineAdminOut']
export type TimelineCreateIn = components['schemas']['TimelineCreateIn']
export type TimelinePatchIn = components['schemas']['TimelinePatchIn']

export async function fetchTimeline(
  locale: string,
): Promise<{ items: TimelineAdminOut[] }> {
  return adminJson<{ items: TimelineAdminOut[] }>(`/timeline/${locale}`)
}

export async function createTimelineRecord(
  locale: string,
  payload: TimelineCreateIn,
): Promise<TimelineAdminOut> {
  return adminJson<TimelineAdminOut>(`/timeline/${locale}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/** Full id permutation of the locale's rows; the backend validates it covers
 * every id exactly once (UNKNOWN_ID / DUPLICATE_ORDER otherwise). */
export async function reorderTimeline(
  locale: string,
  ids: number[],
): Promise<{ items: TimelineAdminOut[] }> {
  return adminJson<{ items: TimelineAdminOut[] }>(
    `/timeline/${locale}/reorder`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    },
  )
}

export async function updateTimelineRecord(
  locale: string,
  id: number,
  payload: TimelinePatchIn,
  ifMatch: string,
): Promise<TimelineAdminOut> {
  return adminJson<TimelineAdminOut>(`/timeline/${locale}/${id}`, {
    method: 'PATCH',
    headers: { 'If-Match': ifMatch, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/** Hard delete (the model keeps no trash); 428/409 when If-Match is missing
 * or stale. */
export async function deleteTimelineRecord(
  locale: string,
  id: number,
  ifMatch: string,
): Promise<void> {
  return adminJson<void>(`/timeline/${locale}/${id}`, {
    method: 'DELETE',
    headers: { 'If-Match': ifMatch },
  })
}
