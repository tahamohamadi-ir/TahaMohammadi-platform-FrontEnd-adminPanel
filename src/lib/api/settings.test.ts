import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchSiteSettings, updateSiteSettings } from '@/lib/api/settings'

const SETTINGS = {
  brandName: 'Taha Mohammadi',
  tagline: 'Research',
  contactEmail: 'a@example.com',
  contactFormEnabled: true,
  updatedAt: '2026-09-01T00:00:00.000Z',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('site settings API (ADMIN-150)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches settings from the real /site endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(SETTINGS))
    const result = await fetchSiteSettings()
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/admin/site',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(result.brandName).toBe('Taha Mohammadi')
  })

  it('sends If-Match with the loaded updatedAt on update', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(SETTINGS))
    await updateSiteSettings(
      { brandName: 'New name' },
      '2026-09-01T00:00:00.000Z',
    )
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('PUT')
    expect(new Headers(init.headers).get('If-Match')).toBe(
      '2026-09-01T00:00:00.000Z',
    )
    expect(JSON.parse(String(init.body))).toEqual({ brandName: 'New name' })
  })

  it('surfaces stale-revision conflicts as a conflict error', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ code: 'CONFLICT', message: 'Stale settings' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    await expect(
      updateSiteSettings({ brandName: 'x' }, 'old'),
    ).rejects.toMatchObject({ kind: 'conflict' })
  })
})
