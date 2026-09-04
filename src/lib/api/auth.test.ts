import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CSRF_HEADER_NAME, setCsrfTokenProvider } from '@/lib/api/client'
import { loginAdmin } from '@/lib/api/auth'

describe('loginAdmin', () => {
  beforeEach(() => {
    setCsrfTokenProvider(() => 'csrf-token')
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ csrfToken: 'csrf-token' }), {
            status: 200,
          }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 1,
              email: 'admin@example.com',
              displayName: 'Admin',
              isStaff: true,
              mfaEnrolled: false,
              otpVerified: false,
            }),
            { status: 200 },
          ),
        ),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches CSRF then posts login with credentials and CSRF header', async () => {
    const user = await loginAdmin({
      email: 'admin@example.com',
      password: 'secret',
    })

    expect(user.email).toBe('admin@example.com')
    expect(fetch).toHaveBeenCalledTimes(2)

    const [, loginInit] = vi.mocked(fetch).mock.calls[1] as [
      string,
      RequestInit,
    ]
    const headers = new Headers(loginInit.headers)
    expect(headers.get(CSRF_HEADER_NAME)).toBe('csrf-token')
    expect(loginInit.credentials).toBe('include')
  })
})
