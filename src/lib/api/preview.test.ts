import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PREVIEW_SHARE_ENTITIES, createPreviewLink } from '@/lib/api/preview'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const LINK = {
  url: 'http://testserver/pv/article/7?token=abc',
  path: '/pv/article/7?token=abc',
  expiresAt: '2026-09-04T12:00:00Z',
  ttlSeconds: 900,
}

describe('preview share API (ADMIN-220)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('exposes exactly the backend-supported entities', () => {
    expect(PREVIEW_SHARE_ENTITIES).toEqual(['landing', 'profile', 'article'])
  })

  it('creates a short-lived link through the real op', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(LINK))
    const result = await createPreviewLink('article', 7)
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/admin/content/article/7/preview-link',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(result.ttlSeconds).toBe(900)
    expect(result.expiresAt).toBe('2026-09-04T12:00:00Z')
  })

  it('surfaces the unsupported-entity 404 honestly', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        {
          code: 'NOT_FOUND',
          message: 'Preview links are not supported for this entity.',
        },
        404,
      ),
    )
    await expect(createPreviewLink('project', 1)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})
