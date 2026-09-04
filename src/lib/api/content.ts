import type { components } from '@/generated/admin-api'
import { adminJson } from '@/lib/api/auth'

/** Entity names and lifecycle statuses exactly as the backend defines them
 * (apps/api/admin_content.py ENTITY_MODELS / VALID_STATUSES). Nothing here
 * is invented — unknown entities are backend 404s. */
export const CONTENT_ENTITIES = [
  'landing',
  'profile',
  'article',
  'series',
  'research-topic',
  'research-statement',
  'project',
  'publication',
  'book',
  'talk',
  'download',
  'course',
  'creative-work',
] as const

export type ContentEntity = (typeof CONTENT_ENTITIES)[number]

export const CONTENT_STATUSES = [
  'draft',
  'review',
  'scheduled',
  'published',
  'archived',
] as const

export type ContentStatus = (typeof CONTENT_STATUSES)[number]

export type ContentListOut = components['schemas']['ContentListOut']
export type ContentListItemOut = components['schemas']['ContentListItemOut']
export type ContentDetailOut = components['schemas']['ContentDetailOut']
export type ContentCreateIn = components['schemas']['ContentCreateIn']
export type ContentUpdateIn = components['schemas']['ContentUpdateIn']
export type ContentSchemaOut = components['schemas']['ContentSchemaOut']
export type ContentFieldSpecOut = components['schemas']['ContentFieldSpecOut']

export interface ContentListParams {
  locale?: string
  status?: string
  q?: string
  page?: number
  pageSize?: number
}

export function contentListPath(
  entity: string,
  params: ContentListParams = {},
): string {
  const search = new URLSearchParams()
  if (params.locale) search.set('locale', params.locale)
  if (params.status) search.set('status', params.status)
  if (params.q) search.set('q', params.q)
  if (params.page !== undefined) search.set('page', String(params.page))
  if (params.pageSize !== undefined) {
    search.set('pageSize', String(params.pageSize))
  }
  const query = search.toString()
  return `/content/${entity}${query ? `?${query}` : ''}`
}

export async function listContent(
  entity: string,
  params: ContentListParams = {},
): Promise<ContentListOut> {
  return adminJson<ContentListOut>(contentListPath(entity, params))
}

export async function fetchContentDetail(
  entity: string,
  id: number,
): Promise<ContentDetailOut> {
  return adminJson<ContentDetailOut>(`/content/${entity}/${id}`)
}

export async function createContent(
  entity: string,
  payload: ContentCreateIn,
): Promise<ContentDetailOut> {
  return adminJson<ContentDetailOut>(`/content/${entity}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function updateContent(
  entity: string,
  id: number,
  payload: ContentUpdateIn,
  ifMatch: string,
): Promise<ContentDetailOut> {
  return adminJson<ContentDetailOut>(`/content/${entity}/${id}`, {
    method: 'PUT',
    headers: { 'If-Match': ifMatch, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function transitionContent(
  entity: string,
  id: number,
  payload: { to: string; reason?: string | null; scheduledFor?: string | null },
): Promise<ContentDetailOut> {
  return adminJson<ContentDetailOut>(`/content/${entity}/${id}/transition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function fetchContentSchema(): Promise<ContentSchemaOut> {
  return adminJson<ContentSchemaOut>('/content/schema')
}

/** Flag-guarded server op: 404 FEATURE_DISABLED unless
 * FEATURE_ADMIN_BULK_ARCHIVE is on. The UI hides it behind the same flag
 * from AdminUserOut.featureFlags. */
export async function bulkArchiveContent(
  entity: string,
  payload: { ids: number[]; reason?: string | null },
): Promise<components['schemas']['ContentBulkArchiveOut']> {
  return adminJson<components['schemas']['ContentBulkArchiveOut']>(
    `/content/${entity}/bulk-archive`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
}
