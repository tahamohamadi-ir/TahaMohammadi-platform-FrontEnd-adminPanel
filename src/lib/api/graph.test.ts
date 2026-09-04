import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  activateGraphVersion,
  createGraphVersion,
  fetchGraphDetail,
  fetchGraphValidation,
  fetchGraphVersions,
  saveGraphPayload,
} from '@/lib/api/graph'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const VERSION = {
  id: 2,
  locale: 'en',
  status: 'draft',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  nodeCount: 3,
  edgeCount: 2,
}

const DETAIL = {
  id: 2,
  locale: 'en',
  status: 'draft',
  createdAt: VERSION.createdAt,
  updatedAt: VERSION.updatedAt,
  nodes: [
    {
      id: 'impact',
      type: 'domain',
      label: 'Human impact',
      accessibleLabel: 'Human impact node',
      colorRole: 'brand',
      iconRole: 'center',
      weight: 5,
      position: { x: 200, y: 200 },
      relatedRecords: [],
    },
  ],
  edges: [
    {
      id: 'impact->research',
      source: 'impact',
      target: 'research',
      relationType: 'supports',
      directed: true,
      weight: 1,
    },
  ],
  groups: [{ name: 'Core', nodeIds: ['impact'] }],
}

describe('graph API client (ADMIN-210)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists versions as a bare array with counts', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([VERSION]))
    const result = await fetchGraphVersions()
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/admin/graph/versions',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(result[0]?.nodeCount).toBe(3)
  })

  it('creates an empty draft with the locale', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(VERSION, 201))
    await createGraphVersion('en')
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ locale: 'en' })
  })

  it('fetches the full detail payload', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(DETAIL))
    const detail = await fetchGraphDetail(2)
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/admin/graph/versions/2',
      expect.anything(),
    )
    expect(detail.nodes[0]?.id).toBe('impact')
    expect(detail.groups[0]?.nodeIds).toEqual(['impact'])
  })

  it('replaces the whole draft payload with If-Match', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ revision: 'rev-2' }))
    await saveGraphPayload(
      2,
      { nodes: DETAIL.nodes, edges: DETAIL.edges, groups: DETAIL.groups },
      DETAIL.updatedAt,
    )
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('PUT')
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toContain(
      '/graph/versions/2/payload',
    )
    expect(new Headers(init.headers).get('If-Match')).toBe(DETAIL.updatedAt)
  })

  it('activates a draft through the activate op', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ id: 2, status: 'active' }),
    )
    const result = await activateGraphVersion(2)
    expect(init_method()).toBe('POST')
    expect(result.status).toBe('active')
  })

  it('fetches the validator report', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        issues: [{ code: 'MISSING_POSITION', nodeId: 'impact' }],
      }),
    )
    const report = await fetchGraphValidation(2)
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toContain(
      '/graph/validation/2',
    )
    expect(report.issues[0]?.code).toBe('MISSING_POSITION')
  })

  function init_method(): string {
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    return String(init?.method)
  }
})
