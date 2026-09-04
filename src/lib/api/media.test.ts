import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  deleteMedia,
  fetchMediaList,
  updateMediaMetadata,
  uploadMedia,
} from '@/lib/api/media'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const LIST = {
  items: [
    {
      id: 5,
      title: 'Cover image',
      mime: 'image/png',
      size: 12345,
      url: '/media/cover.png',
      altText: '',
      altTextEn: '',
      altTextFa: '',
      isActive: true,
      usageCount: 2,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
  ],
  page: 1,
  pageSize: 20,
  total: 1,
}

describe('media API client (ADMIN-180)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists media with search/type/active filters and pagination', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(LIST))
    const result = await fetchMediaList({
      q: 'cover',
      type: 'image',
      active: 'true',
      page: 1,
      pageSize: 20,
    })
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/admin/media?q=cover&type=image&active=true&page=1&pageSize=20',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(result.items[0]?.usageCount).toBe(2)
  })

  it('uploads multipart without overriding the browser Content-Type', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(LIST.items[0], 201))
    const file = new File(['bytes'], 'cover.png', { type: 'image/png' })
    await uploadMedia({ file, title: 'Cover image' })
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(FormData)
    const formData = init.body as FormData
    expect(formData.get('file')).toBe(file)
    expect(formData.get('title')).toBe('Cover image')
    const headers = new Headers(init.headers)
    expect(headers.get('Content-Type')).toBeNull()
  })

  it('updates metadata with If-Match optimistic locking', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(LIST.items[0]))
    await updateMediaMetadata(
      5,
      { altTextEn: 'A cover', isActive: true },
      '2026-09-01T00:00:00.000Z',
    )
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('PUT')
    expect(new Headers(init.headers).get('If-Match')).toBe(
      '2026-09-01T00:00:00.000Z',
    )
    expect(JSON.parse(String(init.body))).toEqual({
      altTextEn: 'A cover',
      isActive: true,
    })
  })

  it('deletes unreferenced media (204)', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))
    await deleteMedia(5)
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/admin/media/5',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('surfaces the in-use delete guard as a conflict', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        {
          code: 'MEDIA_IN_USE',
          message:
            'Media is still referenced by content and cannot be deleted.',
          field_errors: {},
          usageCount: 2,
        },
        409,
      ),
    )
    await expect(deleteMedia(5)).rejects.toMatchObject({
      kind: 'conflict',
      code: 'MEDIA_IN_USE',
    })
  })
})
