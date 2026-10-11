import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CSRF_HEADER_NAME, setCsrfTokenProvider } from '@/lib/api/client'
import { fetchContentDetail, updateContent } from '@/lib/api/content'
import { installDefaultCsrfProvider, loginAdmin } from '@/lib/api/auth'

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

/**
 * Regression: Django rotates the CSRF cookie on login (`rotate_token` in
 * `django.contrib.auth.login`). The hermetic journey showed that a token
 * cached before login is then rejected by `admin_common._check_csrf` with
 * 403 `CSRF_FAILED`, so the first content save after sign-in never landed.
 *
 * These cases pin the required behavior against the real rotation: after a
 * successful login the client must present the *current* cookie's token, and
 * a single 403 `CSRF_FAILED` must be retried once with a freshly read token
 * rather than surfacing a dead end to the editor.
 */
describe('CSRF token lifecycle across login rotation', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    setCsrfTokenProvider(null)
  })

  function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status })
  }

  it('re-reads the CSRF token after login instead of replaying the pre-login one', async () => {
    // Cookies the server hands back, in order. Login rotates the secret.
    const issued = ['csrf-before-login', 'csrf-after-login']
    let issuedIndex = 0
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/auth/csrf')) {
          return jsonResponse({ csrfToken: issued[issuedIndex++] })
        }
        if (url.endsWith('/auth/login')) {
          // Assert the login POST actually carried the pre-login token, so
          // this test cannot pass against a client that sends no CSRF at all.
          const sent = new Headers(init?.headers).get('X-CSRFToken')
          expect(sent).toBe('csrf-before-login')
          return jsonResponse({
            id: 1,
            email: 'admin@example.com',
            displayName: 'Admin',
            isStaff: true,
            mfaEnrolled: false,
            otpVerified: false,
          })
        }
        if (url.includes('/content/article/7')) {
          return jsonResponse({
            id: 7,
            locale: 'en',
            slug: 'a',
            title: 'A',
            status: 'draft',
            publishedAt: null,
            createdAt: '2026-09-01T00:00:00.000Z',
            updatedAt: '2026-09-02T00:00:00.000Z',
            fields: {},
          })
        }
        throw new Error(`unexpected fetch: ${url}`)
      },
    )
    vi.stubGlobal('fetch', fetchMock)

    installDefaultCsrfProvider()
    await loginAdmin({ email: 'admin@example.com', password: 'secret' })

    // The first mutation after login must NOT carry the pre-login secret.
    await updateContent(
      'article',
      7,
      { title: 'B' },
      '2026-09-02T00:00:00.000Z',
    )

    const mutation = fetchMock.mock.calls.at(-1) as unknown as [
      string,
      RequestInit,
    ]
    const headers = new Headers(mutation[1].headers)
    expect(headers.get(CSRF_HEADER_NAME)).toBe('csrf-after-login')
  })

  it('retries a mutation once with a refreshed token when the server answers 403 CSRF_FAILED', async () => {
    let csrfReads = 0
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.endsWith('/auth/csrf')) {
          csrfReads += 1
          return jsonResponse({ csrfToken: `csrf-token-${csrfReads}` })
        }
        if (url.includes('/content/article/7')) {
          if (
            new Headers(init?.headers).get(CSRF_HEADER_NAME) === 'csrf-token-1'
          ) {
            return jsonResponse(
              {
                code: 'CSRF_FAILED',
                message: 'CSRF token missing or invalid.',
              },
              403,
            )
          }
          return jsonResponse({
            id: 7,
            locale: 'en',
            slug: 'a',
            title: 'Saved',
            status: 'draft',
            publishedAt: null,
            createdAt: '2026-09-01T00:00:00.000Z',
            updatedAt: '2026-09-03T00:00:00.000Z',
            fields: {},
          })
        }
        throw new Error(`unexpected fetch: ${url}`)
      },
    )
    vi.stubGlobal('fetch', fetchMock)

    installDefaultCsrfProvider()
    const saved = await updateContent(
      'article',
      7,
      { title: 'Saved' },
      '2026-09-02T00:00:00.000Z',
    )

    expect(saved.title).toBe('Saved')
    // A GET is never retried and never carries the CSRF header.
    await fetchContentDetail('article', 7)
    const read = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit]
    expect(new Headers(read[1].headers).get(CSRF_HEADER_NAME)).toBeNull()
  })
})
