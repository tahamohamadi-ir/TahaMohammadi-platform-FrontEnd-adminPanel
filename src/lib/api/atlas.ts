/** The Knowledge Atlas admin API client (Plan B Task 8).
 *
 * Typed client over `adminJson` (same-origin session + CSRF via
 * `adminFetch`, normalized AdminApiError). Every type re-exports a component
 * from `@/generated/admin-api` — no hand-written duplicates. Mutations carry
 * the Atlas wire revision (`version_revision()` → `<pk>-<ISO>`) in `If-Match`.
 */

import type { components } from '@/generated/admin-api'
import { adminJson } from '@/lib/api/auth'

export type AtlasVersionRow = components['schemas']['AtlasVersionRowOut']
export type AtlasNodeRow = { publicKey: string; [key: string]: unknown }
export type AtlasRelationRow = {
  key: string
  sourceKey: string
  relationTypeKey: string
  targetKey: string
  directed: boolean
  weight: number
  visible: boolean
  [key: string]: unknown
}
export type AtlasGroupRow = {
  key: string
  label: string
  memberKeys: string[]
  [key: string]: unknown
}
export type AtlasValidationOut = {
  blocking: Array<Record<string, unknown>>
  warnings: Array<Record<string, unknown>>
  [key: string]: unknown
}
export type AtlasTaxonomyRow = {
  key: string
  label_en: string
  label_fa: string
  active: boolean
  sort_order: number
  [key: string]: unknown
}
export interface AtlasNodeWriteBody {
  nodeTypeKey: string
  canonicalSource?: string
  canonicalTranslationKey?: string | null
  importance?: number | null
  visible?: boolean | null
  mobileOverviewPriority?: string | null
  groupKeys?: string[] | null
  pin?: { x?: number | null; y?: number | null; z?: number | null } | null
  overrides?: Record<string, Record<string, unknown>> | null
  [key: string]: unknown
}
export interface AtlasBulkGraphBody {
  nodes: Array<Record<string, unknown>>
  relations: Array<Record<string, unknown>>
  groups: Array<Record<string, unknown>>
  [key: string]: unknown
}

const BASE = '/atlas'

function ifMatch(revision?: string | null): RequestInit {
  return revision ? ({ headers: { 'If-Match': revision } } as RequestInit) : {}
}

export async function fetchAtlasVersions(): Promise<AtlasVersionRow[]> {
  return adminJson<AtlasVersionRow[]>(`${BASE}/versions`)
}

export async function createAtlasVersion(
  label: string,
): Promise<AtlasVersionRow> {
  return adminJson<AtlasVersionRow>(`${BASE}/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  })
}

export async function cloneAtlasVersion(
  id: number,
  label: string,
): Promise<AtlasVersionRow> {
  return adminJson<AtlasVersionRow>(`${BASE}/versions/${id}/clone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  })
}

export async function fetchAtlasVersion(id: number): Promise<AtlasVersionRow> {
  return adminJson<AtlasVersionRow>(`${BASE}/versions/${id}`)
}

export async function updateAtlasVersionStatus(
  id: number,
  action: 'archive',
  revision: string,
): Promise<AtlasVersionRow> {
  return adminJson<AtlasVersionRow>(`${BASE}/versions/${id}/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(ifMatch(revision).headers as Record<string, string> | undefined),
    } as Record<string, string>,
    body: JSON.stringify({}),
  })
}

export async function fetchAtlasGraph(id: number): Promise<{
  nodes: AtlasNodeRow[]
  relations: AtlasRelationRow[]
  groups: AtlasGroupRow[]
}> {
  return adminJson(`${BASE}/versions/${id}/graph`)
}

export async function saveAtlasGraph(
  id: number,
  body: AtlasBulkGraphBody,
  revision: string,
): Promise<{ nodeCount: number; relationCount: number }> {
  return adminJson(`${BASE}/versions/${id}/graph`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'If-Match': revision },
    body: JSON.stringify(body),
  })
}

export async function listAtlasNodes(id: number): Promise<AtlasNodeRow[]> {
  return adminJson(`${BASE}/versions/${id}/nodes`)
}

export async function createAtlasNode(
  id: number,
  body: AtlasNodeWriteBody,
  revision: string,
): Promise<AtlasNodeRow> {
  return adminJson(`${BASE}/versions/${id}/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'If-Match': revision },
    body: JSON.stringify(body),
  })
}

export async function updateAtlasNode(
  id: number,
  key: string,
  body: Partial<AtlasNodeWriteBody>,
  revision: string,
): Promise<AtlasNodeRow & { revision: string }> {
  return adminJson(`${BASE}/versions/${id}/nodes/${key}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'If-Match': revision },
    body: JSON.stringify(body),
  })
}

export async function deleteAtlasNode(
  id: number,
  key: string,
  revision: string,
): Promise<void> {
  await adminJson(`${BASE}/versions/${id}/nodes/${key}`, {
    method: 'DELETE',
    headers: { 'If-Match': revision },
  })
}

export async function listAtlasRelations(
  id: number,
): Promise<AtlasRelationRow[]> {
  return adminJson(`${BASE}/versions/${id}/relations`)
}

export async function createAtlasRelation(
  id: number,
  body: {
    sourceKey: string
    relationTypeKey: string
    targetKey: string
    directed?: boolean | null
    weight?: number | null
    explanation?: Record<string, string> | null
  },
  revision: string,
): Promise<AtlasRelationRow> {
  return adminJson(`${BASE}/versions/${id}/relations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'If-Match': revision },
    body: JSON.stringify(body),
  })
}

export async function updateAtlasRelation(
  id: number,
  key: string,
  body: {
    directed?: boolean | null
    weight?: number | null
    visible?: boolean | null
  },
  revision: string,
): Promise<AtlasRelationRow> {
  return adminJson(`${BASE}/versions/${id}/relations/${key}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'If-Match': revision },
    body: JSON.stringify(body),
  })
}

export async function deleteAtlasRelation(
  id: number,
  key: string,
  revision: string,
): Promise<void> {
  await adminJson(`${BASE}/versions/${id}/relations/${key}`, {
    method: 'DELETE',
    headers: { 'If-Match': revision },
  })
}

export async function listAtlasGroups(id: number): Promise<AtlasGroupRow[]> {
  return adminJson(`${BASE}/versions/${id}/groups`)
}

export async function createAtlasGroup(
  id: number,
  label: string,
  revision: string,
): Promise<AtlasGroupRow> {
  return adminJson(`${BASE}/versions/${id}/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'If-Match': revision },
    body: JSON.stringify({ label }),
  })
}

export async function saveGroups(
  id: number,
  groupKey: string,
  body: { nodeKeys: string[] },
  revision: string,
): Promise<AtlasGroupRow> {
  return adminJson(`${BASE}/versions/${id}/groups/${groupKey}/members`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'If-Match': revision },
    body: JSON.stringify(body),
  })
}

export type AtlasTaxonomy = {
  nodeTypes: Awaited<ReturnType<typeof listAtlasNodeTypes>>
  relationTypes: Awaited<ReturnType<typeof listAtlasRelationTypes>>
}

export async function listAtlasNodeTypes(): Promise<AtlasTaxonomyRow[]> {
  return adminJson(`${BASE}/node-types`)
}

export async function listAtlasRelationTypes(): Promise<AtlasTaxonomyRow[]> {
  return adminJson(`${BASE}/relation-types`)
}

export async function listTaxonomy(): Promise<AtlasTaxonomy> {
  const [nodeTypes, relationTypes] = await Promise.all([
    listAtlasNodeTypes(),
    listAtlasRelationTypes(),
  ])
  return { nodeTypes, relationTypes }
}

export async function saveNodeType(
  body: { key: string; label_en: string; label_fa: string; active?: boolean },
  revision?: string,
): Promise<AtlasTaxonomyRow> {
  return adminJson(`${BASE}/node-types`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(revision ? { 'If-Match': revision } : {}),
    },
    body: JSON.stringify(body),
  })
}

export async function saveRelationType(
  body: {
    key: string
    label_en: string
    label_fa: string
    directedDefault?: boolean
    allowedSourceTypes?: string[]
    allowedTargetTypes?: string[]
  },
  revision?: string,
): Promise<AtlasTaxonomyRow> {
  return adminJson(`${BASE}/relation-types`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(revision ? { 'If-Match': revision } : {}),
    },
    body: JSON.stringify(body),
  })
}

export async function recomputeLayout(
  id: number,
  revision: string,
): Promise<{
  layoutRevision: number
  coordinates: Record<string, [number, number, number]>
}> {
  return adminJson(`${BASE}/versions/${id}/layout`, {
    method: 'POST',
    headers: { 'If-Match': revision },
    body: JSON.stringify({}),
  })
}

export async function validateAtlasVersion(
  id: number,
): Promise<AtlasValidationOut> {
  return adminJson(`${BASE}/versions/${id}/validate`)
}

export async function activateAtlasVersion(
  id: number,
  revision: string,
): Promise<{
  id: number
  status: string
  publishedAt: string
  enqueuedPublicationJob: number | null
}> {
  return adminJson(`${BASE}/versions/${id}/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'If-Match': revision },
    body: JSON.stringify({}),
  })
}

export async function fetchAtlasPreviewToken(
  id: number,
  locale: string,
): Promise<{ preview_url: string; expires_at: number; version_id: number }> {
  return adminJson(`${BASE}/versions/${id}/preview-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locale }),
  })
}

export async function fetchCanonicalCandidates(
  source: string,
  query = '',
): Promise<
  Array<{
    translationKey: string
    title: string
    localeStatus: Record<string, boolean>
    publishable: Record<string, boolean>
  }>
> {
  const params = new URLSearchParams({ source })
  if (query) {
    params.set('q', query)
  }
  return adminJson<AtlasCanonicalCandidates>(
    `${BASE}/canonical-candidates?${params}`,
  )
}

export type AtlasCanonicalCandidates = Array<{
  translationKey: string
  title: string
  localeStatus: Record<string, boolean>
  publishable: Record<string, boolean>
}>
