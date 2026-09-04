import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CONTENT_ENTITIES,
  CONTENT_STATUSES,
  bulkArchiveContent,
  createContent,
  fetchContentDetail,
  listContent,
  transitionContent,
  updateContent,
} from '@/lib/api/content'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const LIST = {
  items: [
    {
      id: 7,
      locale: 'en',
      slug: 'hello-world',
      title: 'Hello world',
      status: 'draft',
      publishedAt: null,
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
  ],
  page: 2,
  pageSize: 20,
  total: 21,
}

const DETAIL = {
  id: 7,
  locale: 'en',
  slug: 'hello-world',
  title: 'Hello world',
  status: 'draft',
  fields: { excerpt: 'Hi' },
  publishedAt: null,
  createdAt: '2026-08-31T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
}

describe('content API client (ADMIN-160/170)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('exposes only real backend entities and statuses', () => {
    expect(CONTENT_ENTITIES).toContain('article')
    expect(CONTENT_ENTITIES).toContain('series')
    expect(CONTENT_ENTITIES).toContain('research-topic')
    expect(CONTENT_ENTITIES).toContain('project')
    expect(CONTENT_ENTITIES).toContain('publication')
    expect(CONTENT_STATUSES).toEqual([
      'draft',
      'review',
      'scheduled',
      'published',
      'archived',
    ])
  })

  it('lists content with filters and pagination as query params', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(LIST))
    const result = await listContent('article', {
      locale: 'en',
      status: 'draft',
      q: 'hello',
      page: 2,
      pageSize: 20,
    })
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/admin/content/article?locale=en&status=draft&q=hello&page=2&pageSize=20',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(result.total).toBe(21)
    expect(result.items[0]?.slug).toBe('hello-world')
  })

  it('omits unset list filters', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(LIST))
    await listContent('article', {})
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/admin/content/article',
      expect.anything(),
    )
  })

  it('fetches one content detail', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(DETAIL))
    const detail = await fetchContentDetail('article', 7)
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/admin/content/article/7',
      expect.anything(),
    )
    expect(detail.fields.excerpt).toBe('Hi')
  })

  it('creates content with the real create payload', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(DETAIL))
    await createContent('article', {
      title: 'Hello world',
      slug: 'hello-world',
      locale: 'en',
      status: 'draft',
      fields: { excerpt: 'Hi' },
    })
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({
      title: 'Hello world',
      slug: 'hello-world',
      locale: 'en',
      status: 'draft',
      fields: { excerpt: 'Hi' },
    })
  })

  it('updates content with If-Match optimistic locking', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(DETAIL))
    await updateContent(
      'article',
      7,
      { title: 'New title' },
      '2026-09-01T00:00:00.000Z',
    )
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('PUT')
    expect(new Headers(init.headers).get('If-Match')).toBe(
      '2026-09-01T00:00:00.000Z',
    )
  })

  it('sends lifecycle transitions and honors stale-revision conflicts', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(DETAIL))
      .mockResolvedValueOnce(
        jsonResponse({ code: 'STALE_REVISION', message: 'Stale' }, 409),
      )
    await transitionContent('article', 7, { to: 'published', reason: 'ready' })
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toContain(
      '/content/article/7/transition',
    )
    expect(JSON.parse(String(init.body))).toEqual({
      to: 'published',
      reason: 'ready',
    })
    await expect(
      transitionContent('article', 7, { to: 'published' }),
    ).rejects.toMatchObject({ kind: 'conflict' })
  })

  it('schedules with the real scheduledFor field', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(DETAIL))
    await transitionContent('article', 7, {
      to: 'scheduled',
      scheduledFor: '2026-10-01T09:00:00Z',
    })
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({
      to: 'scheduled',
      scheduledFor: '2026-10-01T09:00:00Z',
    })
  })

  it('bulk-archives through the flag-guarded op', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ archived: 2, ids: [7, 8], skipped: 0 }),
    )
    const result = await bulkArchiveContent('article', {
      ids: [7, 8],
      reason: 'cleanup',
    })
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/admin/content/article/bulk-archive',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(
      JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body)),
    ).toEqual({
      ids: [7, 8],
      reason: 'cleanup',
    })
    expect(result.archived).toBe(2)
  })
})
