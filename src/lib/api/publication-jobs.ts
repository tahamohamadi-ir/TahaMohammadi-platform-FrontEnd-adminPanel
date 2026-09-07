import type { components } from '@/generated/admin-api'
import { adminJson } from '@/lib/api/auth'

/** Typed publication-job adapters (PU-09-transport, PRODUCT-INTERFACES-V2 §I06).
 *
 * Shapes come from the accepted generated admin schema; routes, the
 * `If-Match` precondition on retry, and the `Idempotency-Key` replay rule
 * mirror `Back-End/apps/api/admin_publication_jobs.py`. CSRF/session handling
 * rides on the shared `adminFetch` provider — this module adds no credential
 * storage and invents no job states. */

export type PublicationJobOut = components['schemas']['PublicationJobOut']
export type PublicationJobListOut =
  components['schemas']['PublicationJobListOut']

export interface PublicationJobListParams {
  page?: number
  pageSize?: number
  state?: string
  locale?: string
}

export function publicationJobListPath(
  params: PublicationJobListParams = {},
): string {
  const search = new URLSearchParams()
  if (params.page !== undefined) search.set('page', String(params.page))
  if (params.pageSize !== undefined) {
    search.set('page_size', String(params.pageSize))
  }
  if (params.state) search.set('state', params.state)
  if (params.locale) search.set('locale', params.locale)
  const query = search.toString()
  return `/publication-jobs${query ? `?${query}` : ''}`
}

export async function listPublicationJobs(
  params: PublicationJobListParams = {},
): Promise<PublicationJobListOut> {
  return adminJson<PublicationJobListOut>(publicationJobListPath(params))
}

export async function fetchPublicationJob(
  jobId: string,
): Promise<PublicationJobOut> {
  return adminJson<PublicationJobOut>(`/publication-jobs/${jobId}`)
}

export interface RetryPublicationJobOptions {
  /** `updatedAt` of the job detail the retry was requested from. When omitted
   * the server retries unconditionally; when present a moved job answers 409/412
   * (normalized to `AdminApiError` kind `conflict`). */
  ifMatch?: string
  /** Replay key: the server returns the existing retry job instead of
   * enqueueing a duplicate. */
  idempotencyKey?: string
}

export async function retryPublicationJob(
  jobId: string,
  options: RetryPublicationJobOptions = {},
): Promise<PublicationJobOut> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (options.ifMatch) headers['If-Match'] = options.ifMatch
  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey
  }
  return adminJson<PublicationJobOut>(`/publication-jobs/${jobId}/retry`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  })
}
