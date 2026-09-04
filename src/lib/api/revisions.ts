import type { components } from '@/generated/admin-api'
import { adminJson } from '@/lib/api/auth'

export type ContentRevisionOut = components['schemas']['ContentRevisionOut']
export type ContentRevisionListOut =
  components['schemas']['ContentRevisionListOut']

export async function fetchContentRevisions(
  entity: string,
  id: number,
): Promise<ContentRevisionListOut> {
  return adminJson<ContentRevisionListOut>(`/content/${entity}/${id}/revisions`)
}

export async function createContentRevision(
  entity: string,
  id: number,
  payload: { note?: string | null },
): Promise<ContentRevisionOut> {
  return adminJson<ContentRevisionOut>(`/content/${entity}/${id}/revisions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/** Backend restores as a DRAFT and never overwrites the live published row. */
export async function restoreContentRevision(
  entity: string,
  id: number,
  revisionId: number,
): Promise<components['schemas']['ContentDetailOut']> {
  return adminJson<components['schemas']['ContentDetailOut']>(
    `/content/${entity}/${id}/revisions/${revisionId}/restore`,
    { method: 'POST' },
  )
}
