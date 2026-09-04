import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createContentRevision,
  fetchContentRevisions,
  restoreContentRevision,
} from '@/lib/api/revisions'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const REVISIONS = {
  items: [
    {
      id: 3,
      entityKey: 'article',
      objectId: 7,
      note: 'before publish',
      createdAt: '2026-09-01T12:00:00.000Z',
      createdById: 1,
    },
    {
      id: 2,
      entityKey: 'article',
      objectId: 7,
      note: '',
      createdAt: '2026-08-31T12:00:00.000Z',
      createdById: null,
    },
  ],
}

describe('content revisions API (ADMIN-230)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists immutable revisions for one row', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(REVISIONS))
    const result = await fetchContentRevisions('article', 7)
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/admin/content/article/7/revisions',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(result.items).toHaveLength(2)
    expect(result.items[0]?.note).toBe('before publish')
  })

  it('creates a snapshot with the optional note', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(REVISIONS.items[0]))
    await createContentRevision('article', 7, { note: 'before publish' })
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ note: 'before publish' })
  })

  it('restores a revision as draft through the real restore op', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ id: 7, status: 'draft', fields: {} }),
    )
    await restoreContentRevision('article', 7, 3)
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toContain(
      '/content/article/7/revisions/3/restore',
    )
  })
})
