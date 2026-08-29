import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CSRF_HEADER_NAME,
  adminFetch,
  setCsrfTokenProvider,
} from '@/lib/api/client'

describe('adminFetch', () => {
  beforeEach(() => {
    setCsrfTokenProvider(null)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls same-origin admin API paths with cookie credentials', async () => {
    await adminFetch('/auth/me')

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/admin/auth/me',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('does not attach CSRF headers on GET when no provider is registered', async () => {
    await adminFetch('/auth/me')

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    const headers = new Headers(init.headers)
    expect(headers.has(CSRF_HEADER_NAME)).toBe(false)
  })

  it('attaches CSRF header on POST when a provider is registered', async () => {
    setCsrfTokenProvider(() => 'test-csrf-token')

    await adminFetch('/auth/logout', { method: 'POST' })

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    const headers = new Headers(init.headers)
    expect(headers.get(CSRF_HEADER_NAME)).toBe('test-csrf-token')
  })

  it('skips CSRF header when the provider returns null', async () => {
    setCsrfTokenProvider(() => null)

    await adminFetch('/auth/logout', { method: 'POST' })

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    const headers = new Headers(init.headers)
    expect(headers.has(CSRF_HEADER_NAME)).toBe(false)
  })
})
