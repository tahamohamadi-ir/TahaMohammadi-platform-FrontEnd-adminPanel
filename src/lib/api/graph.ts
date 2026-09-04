import type { components } from '@/generated/admin-api'
import { adminJson } from '@/lib/api/auth'

export type GraphVersionOut = components['schemas']['GraphVersionOut']
export type GraphVersionDetailOut =
  components['schemas']['GraphVersionDetailOut']
export type GraphPayloadIn = components['schemas']['GraphPayloadIn']
export type GraphValidationOut = components['schemas']['GraphValidationOut']
export type GraphNode = { [key: string]: unknown }
export type GraphEdge = { [key: string]: unknown }
export type GraphGroup = { [key: string]: unknown }

export async function fetchGraphVersions(): Promise<GraphVersionOut[]> {
  return adminJson<GraphVersionOut[]>('/graph/versions')
}

export async function createGraphVersion(
  locale: string,
): Promise<GraphVersionOut> {
  return adminJson<GraphVersionOut>('/graph/versions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locale }),
  })
}

export async function fetchGraphDetail(
  versionId: number,
): Promise<GraphVersionDetailOut> {
  return adminJson<GraphVersionDetailOut>(`/graph/versions/${versionId}`)
}

/** Whole-payload replace on a DRAFT (active versions are immutable: 409
 * IMMUTABLE_ACTIVE). If-Match carries the version's updatedAt. */
export async function saveGraphPayload(
  versionId: number,
  payload: GraphPayloadIn,
  ifMatch: string,
): Promise<{ revision: string }> {
  return adminJson<{ revision: string }>(
    `/graph/versions/${versionId}/payload`,
    {
      method: 'PUT',
      headers: { 'If-Match': ifMatch, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
}

/** Draft-only; archives the previous active of the locale and re-runs the
 * validator (validation failure blocks activation). */
export async function activateGraphVersion(
  versionId: number,
): Promise<{ id: number; status: string }> {
  return adminJson<{ id: number; status: string }>(
    `/graph/versions/${versionId}/activate`,
    { method: 'POST' },
  )
}

export async function fetchGraphValidation(
  versionId: number,
): Promise<GraphValidationOut> {
  return adminJson<GraphValidationOut>(`/graph/validation/${versionId}`)
}
