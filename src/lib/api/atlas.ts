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
export type AtlasVersionDetail = components['schemas']['AtlasVersionDetailOut']
export type AtlasNodeRow = components['schemas']['AtlasNodeRowOut']
export type AtlasRelationRow = components['schemas']['AtlasRelationRowOut']
export type AtlasGroupRow = components['schemas']['AtlasGroupRowOut']
export type AtlasNodeTypeRow = components['schemas']['AtlasNodeTypeRowOut']
export type AtlasRelationTypeRow =
  components['schemas']['AtlasRelationTypeRowOut']
export type AtlasNodeWriteBody = components['schemas']['AtlasNodeWriteIn']
export type AtlasNodePatchBody = components['schemas']['AtlasNodePatchIn']
export type AtlasRelationWriteBody =
  components['schemas']['AtlasRelationWriteIn']
export type AtlasRelationPatchBody =
  components['schemas']['AtlasRelationPatchIn']
export type AtlasGroupWriteBody = components['schemas']['AtlasGroupWriteIn']
export type AtlasMembersBody = components['schemas']['AtlasMembersIn']
export type AtlasBulkGraphBody = components['schemas']['AtlasBulkGraphIn']
export type AtlasCanonicalCandidate =
  components['schemas']['AtlasCanonicalCandidateOut']

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
  body: AtlasRelationWriteBody,
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
  body: AtlasRelationPatchBody,
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
  body: AtlasMembersBody,
  revision: string,
): Promise<AtlasGroupRow> {
  return adminJson(`${BASE}/versions/${id}/groups/${groupKey}/members`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'If-Match': revision },
    body: JSON.stringify(body),
  })
}

export type AtlasTaxonomyRow = AtlasNodeTypeRow | AtlasRelationTypeRow

export type AtlasTaxonomy = {
  nodeTypes: AtlasNodeTypeRow[]
  relationTypes: AtlasRelationTypeRow[]
}

export async function listAtlasNodeTypes(): Promise<AtlasNodeTypeRow[]> {
  return adminJson(`${BASE}/node-types`)
}

export async function listAtlasRelationTypes(): Promise<
  AtlasRelationTypeRow[]
> {
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
  body:
    | components['schemas']['AtlasNodeTypeWriteIn']
    | components['schemas']['AtlasNodeTypePatchIn'],
  revision?: string,
): Promise<AtlasNodeTypeRow> {
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
  body:
    | components['schemas']['AtlasRelationTypeWriteIn']
    | components['schemas']['AtlasNodeTypePatchIn'],
  revision?: string,
): Promise<AtlasRelationTypeRow> {
  return adminJson(`${BASE}/relation-types`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(revision ? { 'If-Match': revision } : {}),
    },
    body: JSON.stringify(body),
  })
}

export async function updateNodeType(
  key: string,
  body: components['schemas']['AtlasNodeTypePatchIn'],
): Promise<AtlasNodeTypeRow> {
  return adminJson(`${BASE}/node-types/${encodeURIComponent(key)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function deleteNodeType(key: string): Promise<void> {
  await adminJson(`${BASE}/node-types/${encodeURIComponent(key)}`, {
    method: 'DELETE',
  })
}

export async function updateRelationType(
  key: string,
  // Backend `patch_relation_type` declares `AtlasNodeTypePatchIn` (Task 8
  // fix): the relation PATCH carries labels/active/sort only — hierarchy
  // role and the allowed-pair lists are creation-time metadata.
  body: components['schemas']['AtlasNodeTypePatchIn'],
): Promise<AtlasRelationTypeRow> {
  return adminJson(`${BASE}/relation-types/${encodeURIComponent(key)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function deleteRelationType(key: string): Promise<void> {
  await adminJson(`${BASE}/relation-types/${encodeURIComponent(key)}`, {
    method: 'DELETE',
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

/** One wire issue from `validate_version(...).to_dict()` (spec §20).
 *
 * The validate endpoint answers `response={200: dict}` — no generated
 * schema — so this shape is hand-written from the wire truth
 * (`{code, nodeKey?, relationKey?, groupKey?, messageToken}`).
 */
export interface AtlasValidationIssue {
  code: string
  nodeKey?: string
  relationKey?: string
  groupKey?: string
  messageToken: string
}

export interface AtlasValidationOut {
  blocking: AtlasValidationIssue[]
  warnings: AtlasValidationIssue[]
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
): Promise<AtlasCanonicalCandidate[]> {
  const params = new URLSearchParams({ source })
  if (query) {
    params.set('q', query)
  }
  return adminJson<AtlasCanonicalCandidates>(
    `${BASE}/canonical-candidates?${params}`,
  )
}

export type AtlasCanonicalCandidates = AtlasCanonicalCandidate[]
