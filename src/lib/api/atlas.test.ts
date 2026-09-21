import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  activateAtlasVersion,
  cloneAtlasVersion,
  createAtlasRelation,
  createAtlasVersion,
  deleteAtlasNode,
  deleteAtlasRelation,
  fetchAtlasGraph,
  fetchAtlasPreviewToken,
  fetchAtlasVersion,
  fetchAtlasVersions,
  fetchCanonicalCandidates,
  listTaxonomy,
  saveNodeType,
  saveRelationType,
  recomputeLayout,
  saveAtlasGraph,
  saveGroups,
  updateAtlasNode,
  updateAtlasRelation,
  updateAtlasVersionStatus,
  validateAtlasVersion,
} from '@/lib/api/atlas'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const ROW = {
  id: 3,
  status: 'draft',
  label: 'plan-b',
  revision: '3-2026-09-16T12:00:00+00:00',
  createdAt: '2026-09-16T12:00:00+00:00',
  updatedAt: '2026-09-16T12:00:00+00:00',
  nodeCount: 2,
  relationCount: 1,
}

const OLD_REVISION = '3-2026-09-16T11:00:00+00:00'

describe('atlas API client (Plan B Task 8)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function initOf(index = 0): RequestInit {
    const [, init] = vi.mocked(fetch).mock.calls[index] as [string, RequestInit]
    return init ?? {}
  }

  function urlOf(index = 0): string {
    const [url] = vi.mocked(fetch).mock.calls[index] as [string]
    return String(url)
  }

  it('lists versions from the bare array', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([ROW]))
    const rows = await fetchAtlasVersions()
    expect(urlOf()).toBe('/api/v1/admin/atlas/versions')
    expect(rows[0]?.id).toBe(3)
  })

  it('creates a draft with a label', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(ROW, 201))
    await createAtlasVersion('plan-b')
    expect(initOf().method).toBe('POST')
    expect(JSON.parse(String(initOf().body))).toEqual({ label: 'plan-b' })
  })

  it('clones with a label and 201 handling', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(ROW, 201))
    await cloneAtlasVersion(3, 'plan-b-clone')
    expect(urlOf()).toBe('/api/v1/admin/atlas/versions/3/clone')
    expect(initOf().method).toBe('POST')
    expect(JSON.parse(String(initOf().body))).toEqual({
      label: 'plan-b-clone',
    })
  })

  it('fetches one version detail', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(ROW))
    const detail = await fetchAtlasVersion(3)
    expect(urlOf()).toBe('/api/v1/admin/atlas/versions/3')
    expect(detail.revision).toBe(ROW.revision)
  })

  it('fetches the graph rows', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ nodes: [], relations: [], groups: [] }),
    )
    const graph = await fetchAtlasGraph(3)
    expect(urlOf()).toBe('/api/v1/admin/atlas/versions/3/graph')
    expect(graph.nodes).toEqual([])
  })

  it('saves the whole graph with If-Match', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ nodeCount: 1 }))
    await saveAtlasGraph(
      3,
      { nodes: [], relations: [], groups: [] },
      OLD_REVISION,
    )
    expect(initOf().method).toBe('PUT')
    expect(urlOf()).toBe('/api/v1/admin/atlas/versions/3/graph')
    expect(new Headers(initOf().headers).get('If-Match')).toBe(OLD_REVISION)
  })

  it('updates a node with If-Match and returns the new revision', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        publicKey: 'method-1a2b3c4d',
        revision: '17-2026-09-16T12:00:00+00:00',
      }),
    )
    const result = await updateAtlasNode(
      3,
      'method-1a2b3c4d',
      { importance: 70 },
      OLD_REVISION,
    )
    expect(urlOf()).toBe('/api/v1/admin/atlas/versions/3/nodes/method-1a2b3c4d')
    expect(initOf().method).toBe('PATCH')
    expect(new Headers(initOf().headers).get('If-Match')).toBe(OLD_REVISION)
    expect(result.revision).toBe('17-2026-09-16T12:00:00+00:00')
  })

  it('surfaces a stale revision as a conflict', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ code: 'STALE_REVISION', message: 'stale' }, 409),
    )
    await expect(
      updateAtlasNode(3, 'x', { importance: 1 }, 'stale'),
    ).rejects.toMatchObject({ kind: 'conflict' })
  })

  it('deletes a node with If-Match (204 handling)', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))
    await deleteAtlasNode(3, 'method-1a2b3c4d', OLD_REVISION)
    expect(initOf().method).toBe('DELETE')
    expect(new Headers(initOf().headers).get('If-Match')).toBe(OLD_REVISION)
  })

  it('creates a relation under the composed key', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        {
          key: 'project-x~uses~method-y',
          sourceKey: 'project-x',
          relationTypeKey: 'uses',
          targetKey: 'project-y',
          directed: true,
          weight: 1,
          visible: true,
        },
        201,
      ),
    )
    await createAtlasRelation(
      3,
      {
        sourceKey: 'project-x',
        relationTypeKey: 'uses',
        targetKey: 'method-y',
      },
      OLD_REVISION,
    )
    expect(urlOf()).toBe('/api/v1/admin/atlas/versions/3/relations')
    expect(initOf().method).toBe('POST')
    expect(new Headers(initOf().headers).get('If-Match')).toBe(OLD_REVISION)
  })

  it('updates and deletes relations by composed key', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        key: 'a~uses~b',
        sourceKey: 'a',
        relationTypeKey: 'uses',
        targetKey: 'b',
        directed: true,
        weight: 2,
        visible: true,
      }),
    )
    await updateAtlasRelation(3, 'a~uses~b', { weight: 2 }, OLD_REVISION)
    expect(initOf(0).method).toBe('PATCH')
    expect(new Headers(initOf(0).headers).get('If-Match')).toBe(OLD_REVISION)
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }))
    await deleteAtlasRelation(3, 'a~uses~b', OLD_REVISION)
    expect(urlOf(1)).toBe('/api/v1/admin/atlas/versions/3/relations/a~uses~b')
  })

  it('replaces group members transactionally', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ key: 'group-1', label: 'L', memberKeys: [] }),
    )
    await saveGroups(3, 'group-1', { nodeKeys: [] }, OLD_REVISION)
    expect(initOf().method).toBe('PUT')
    expect(urlOf()).toBe(
      '/api/v1/admin/atlas/versions/3/groups/group-1/members',
    )
  })

  it('lists the taxonomy in one call', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]))
    const taxonomy = await listTaxonomy()
    expect(urlOf(0)).toBe('/api/v1/admin/atlas/node-types')
    expect(urlOf(1)).toBe('/api/v1/admin/atlas/relation-types')
    expect(taxonomy).toBeDefined()
  })

  it('creates and updates taxonomy rows', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ key: 'dataset', label_en: 'Dataset', label_fa: 'd' }),
    )
    await saveNodeType({
      key: 'dataset',
      label_en: 'Dataset',
      label_fa: 'مجموعه',
    })
    expect(initOf(0).method).toBe('POST')
    expect(urlOf(0)).toBe('/api/v1/admin/atlas/node-types')
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        key: 'informed-by',
        label_en: 'informed by',
        label_fa: 'مطلع از',
      }),
    )
    await saveRelationType({
      key: 'informed-by',
      label_en: 'informed by',
      label_fa: 'مطلع از',
    })
    expect(urlOf(1)).toBe('/api/v1/admin/atlas/relation-types')
  })

  it('recomputes the layout with If-Match', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ layoutRevision: 4, coordinates: {} }),
    )
    await recomputeLayout(3, OLD_REVISION)
    expect(initOf().method).toBe('POST')
    expect(new Headers(initOf().headers).get('If-Match')).toBe(OLD_REVISION)
  })

  it('fetches the validator report (blocking + warnings)', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ blocking: [], warnings: [] }),
    )
    const report = await validateAtlasVersion(3)
    expect(urlOf()).toBe('/api/v1/admin/atlas/versions/3/validate')
    expect(report.blocking).toEqual([])
  })

  it('activates with If-Match and reports the job', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        id: 3,
        status: 'active',
        publishedAt: '2026-09-16T12:00:00+00:00',
        enqueuedPublicationJob: null,
      }),
    )
    const result = await activateAtlasVersion(3, OLD_REVISION)
    expect(initOf().method).toBe('POST')
    expect(result.status).toBe('active')
  })

  it('mints a draft-preview capability for a locale', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        preview_url: '/fa/atlas/preview/#token=cap',
        expires_at: 1,
        version_id: 3,
      }),
    )
    const mint = await fetchAtlasPreviewToken(3, 'fa')
    expect(urlOf()).toBe('/api/v1/admin/atlas/versions/3/preview-token')
    expect(mint.preview_url).toContain('/fa/atlas/preview/#token=')
  })

  it('queries canonical candidates with the picker filters', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([]))
    await fetchCanonicalCandidates('method', 'search text')
    const url = new URL(urlOf(), 'http://local')
    expect(url.pathname).toBe('/api/v1/admin/atlas/canonical-candidates')
    expect(url.searchParams.get('source')).toBe('method')
    expect(url.searchParams.get('q')).toBe('search text')
  })

  it('updates version status (archive) with If-Match', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(ROW))
    await updateAtlasVersionStatus(3, 'archive', OLD_REVISION)
    expect(urlOf()).toBe('/api/v1/admin/atlas/versions/3/archive')
    expect(initOf().method).toBe('POST')
    expect(new Headers(initOf().headers).get('If-Match')).toBe(OLD_REVISION)
  })
})

describe('atlas wire contract pins (Plan B Task 8 fix round)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function initOf(index = 0): RequestInit {
    const [, init] = vi.mocked(fetch).mock.calls[index] as [string, RequestInit]
    return init ?? {}
  }

  function respond(body: unknown, status = 200) {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  }

  it('POST nodes sends If-Match and the write body', async () => {
    respond({
      publicKey: 'topic-1',
      nodeTypeKey: 'topic',
      canonicalSource: 'none',
      importance: 50,
      mobileOverviewPriority: 'none',
      visible: true,
      groupKeys: [],
    })
    const { createAtlasNode } = await import('@/lib/api/atlas')
    await createAtlasNode(
      3,
      { nodeTypeKey: 'topic', importance: 50 },
      OLD_REVISION,
    )
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(String(url)).toBe('/api/v1/admin/atlas/versions/3/nodes')
    expect(init.method).toBe('POST')
    expect(new Headers(init.headers).get('If-Match')).toBe(OLD_REVISION)
    expect(JSON.parse(String(init.body))).toEqual({
      nodeTypeKey: 'topic',
      importance: 50,
    })
  })

  it('node type create without revision sends no If-Match', async () => {
    respond({
      key: 'topic',
      label_en: 'Topic',
      label_fa: 'موضوع',
      active: true,
      canonicalSource: 'none',
      defaultImportance: 50,
      sort_order: 0,
    })
    const { saveNodeType } = await import('@/lib/api/atlas')
    await saveNodeType({
      key: 'topic',
      label_en: 'Topic',
      label_fa: 'موضوع',
      active: true,
    })
    expect(new Headers(initOf().headers).get('If-Match')).toBeNull()
  })

  it('node type in use surfaces a 409 as kind conflict', async () => {
    respond({ detail: 'Node type still referenced by nodes.' }, 409)
    const { saveNodeType } = await import('@/lib/api/atlas')
    await expect(
      saveNodeType({ key: 'x', label_en: 'x', label_fa: 'x' }, '3-old'),
    ).rejects.toMatchObject({ kind: 'conflict', status: 409 })
  })

  it('VALIDATION_BLOCKED (400) preserves the issued envelope', async () => {
    respond(
      {
        code: 'VALIDATION_BLOCKED',
        message: 'The graph blocked activation.',
        issues: [{ code: 'DANGLING_RELATION_ENDPOINT', field: 'sourceKey' }],
      },
      400,
    )
    const { activateAtlasVersion } = await import('@/lib/api/atlas')
    const { AdminApiError: AdminApiErrorClass } = await import('@/lib/api/auth')
    const error = await activateAtlasVersion(3, OLD_REVISION).catch((e) => e)
    expect(error).toBeInstanceOf(AdminApiErrorClass)
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_BLOCKED',
      message: 'The graph blocked activation.',
    })
  })

  it('activate uses If-Match header and POST method', async () => {
    respond({
      id: 3,
      status: 'active',
      publishedAt: '2026-09-18T00:00:00+00:00',
      enqueuedPublicationJob: 12,
    })
    const { activateAtlasVersion } = await import('@/lib/api/atlas')
    await activateAtlasVersion(3, OLD_REVISION)
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(String(url)).toBe('/api/v1/admin/atlas/versions/3/activate')
    expect(init.method).toBe('POST')
    expect(new Headers(init.headers).get('If-Match')).toBe(OLD_REVISION)
  })
})
