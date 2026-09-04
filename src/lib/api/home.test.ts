import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchHomeModules,
  saveHomeModules,
  validateHomeModules,
} from '@/lib/api/home'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const MODULES = {
  revision: '2026-09-01T00:00:00.000Z',
  modules: [
    {
      key: 'hero',
      visible: true,
      order: 1,
      selection_mode: 'manual',
      provenance_note: '',
    },
    {
      key: 'research-graph',
      visible: false,
      order: 2,
      selection_mode: 'manual',
      provenance_note: 'kept off until graph v2',
    },
  ],
}

describe('home modules API (ADMIN-190)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches the locale composition with its revision', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(MODULES))
    const result = await fetchHomeModules('en')
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/admin/home-modules/en',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(result.revision).toBe('2026-09-01T00:00:00.000Z')
    expect(result.modules[0]?.key).toBe('hero')
  })

  it('saves the full module array with If-Match locale revision', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ revision: 'new-rev' }))
    const payload = {
      modules: [
        {
          key: 'hero',
          visible: true,
          order: 1,
          selection_mode: 'manual',
          provenance_note: '',
        },
      ],
    }
    await saveHomeModules('en', payload, MODULES.revision)
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('PUT')
    expect(new Headers(init.headers).get('If-Match')).toBe(MODULES.revision)
    expect(JSON.parse(String(init.body))).toEqual(payload)
  })

  it('runs the server-side dry-run validate', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}))
    await validateHomeModules('en', {
      modules: MODULES.modules.map((module) => ({ ...module })),
    })
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toContain(
      '/home-modules/en/validate',
    )
  })
})
