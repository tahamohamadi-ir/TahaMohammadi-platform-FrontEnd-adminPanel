import type { components } from '@/generated/admin-api'
import { adminJson } from '@/lib/api/auth'

/** Typed composition-page adapters (PU-09-transport, PRODUCT-INTERFACES-V2 §I03).
 *
 * Every shape below comes from the accepted generated admin schema
 * (`src/generated/admin-api.ts`, pinned in `src/generated/openapi-hash.json`).
 * Server envelopes and optimistic locking (`If-Match` on PUT, 409
 * `STALE_REVISION`) mirror `Back-End/apps/api/admin_composition.py`.
 * Nothing here invents endpoints, fields, or publication behavior. */

export type CompositionDetailOut = components['schemas']['CompositionDetailOut']
export type CompositionListOut = components['schemas']['CompositionListOut']
export type CompositionListItemOut =
  components['schemas']['CompositionListItemOut']
export type CompositionCreateIn = components['schemas']['CompositionCreateIn']
export type CompositionUpdateIn = components['schemas']['CompositionUpdateIn']
export type CompositionSchemaOut = components['schemas']['CompositionSchemaOut']
export type CompositionSectionUpdateIn =
  components['schemas']['CompositionSectionUpdateIn']
export type CompositionBlockUpdateIn =
  components['schemas']['CompositionBlockUpdateIn']

export interface CompositionListParams {
  q?: string
  locale?: string
  status?: string
  page?: number
  pageSize?: number
}

export function compositionListPath(
  params: CompositionListParams = {},
): string {
  const search = new URLSearchParams()
  if (params.q) search.set('q', params.q)
  if (params.locale) search.set('locale', params.locale)
  if (params.status) search.set('status', params.status)
  if (params.page !== undefined) search.set('page', String(params.page))
  if (params.pageSize !== undefined) {
    search.set('pageSize', String(params.pageSize))
  }
  const query = search.toString()
  return `/composition${query ? `?${query}` : ''}`
}

export async function listCompositions(
  params: CompositionListParams = {},
): Promise<CompositionListOut> {
  return adminJson<CompositionListOut>(compositionListPath(params))
}

export async function fetchCompositionDetail(
  pageId: number,
): Promise<CompositionDetailOut> {
  return adminJson<CompositionDetailOut>(`/composition/${pageId}`)
}

export async function createComposition(
  payload: CompositionCreateIn,
): Promise<CompositionDetailOut> {
  return adminJson<CompositionDetailOut>('/composition', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/** Replace a composition page. `ifMatch` is the `updatedAt` of the detail the
 * editor was opened against; the server answers 409 `STALE_REVISION` when the
 * row moved (normalized to `AdminApiError` kind `conflict`). */
export async function updateComposition(
  pageId: number,
  payload: CompositionUpdateIn,
  ifMatch: string,
): Promise<CompositionDetailOut> {
  return adminJson<CompositionDetailOut>(`/composition/${pageId}`, {
    method: 'PUT',
    headers: { 'If-Match': ifMatch, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function fetchCompositionSchema(
  kind = 'landing',
): Promise<CompositionSchemaOut> {
  const search = new URLSearchParams({ kind })
  return adminJson<CompositionSchemaOut>(`/composition/schema?${search}`)
}

/** Saved-vs-published distinction lives in the `status` field the server owns
 * (`draft`/`review`/`scheduled`/`published`/`archived`). The adapter never
 * derives publication from any other signal. */
export function isCompositionPublished(page: CompositionDetailOut): boolean {
  return page.status === 'published'
}
