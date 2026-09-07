import type { components } from '@/generated/admin-api'
import { adminJson } from '@/lib/api/auth'

export type GraphVersionOut = components['schemas']['GraphVersionOut']
export type GraphVersionDetailOut =
  components['schemas']['GraphVersionDetailOut']
export type GraphPayloadIn = components['schemas']['GraphPayloadIn']
export type GraphValidationOut = components['schemas']['GraphValidationOut']
export type GraphNode = {
  id: string
  type?: string
  label?: string
  accessibleLabel?: string
  colorRole?: string
  iconRole?: string
  weight?: number
  position?: { x: number; y: number; z?: number }
  relatedRecords?: Array<{ family: string; id: string }>
  [key: string]: unknown
}

export type GraphEdge = {
  id?: string
  source: string
  target: string
  relationType?: string
  directed?: boolean
  weight?: number
  [key: string]: unknown
}

export type GraphGroup = {
  name: string
  nodeIds: string[]
  [key: string]: unknown
}

export const GRAPH_RELATED_FAMILIES = [
  'project',
  'publication',
  'article',
  'research-topic',
  'research-statement',
  'book',
  'talk',
  'download',
  'course',
  'creative-work',
] as const

export const GRAPH_RELATION_TYPES = [
  'relates',
  'supports',
  'mentions',
  'cites',
  'prerequisite',
] as const

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
