import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '@/lib/auth/AuthProvider'
import { createTestQueryClient } from '@/lib/query/client'
import { AtlasPreviewPage } from '@/pages/AtlasPreviewPage'

const ME = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin',
  isStaff: true,
  mfaEnrolled: true,
  otpVerified: true,
  featureFlags: {},
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function tokenResponse(locale: string, versionId = 7) {
  return jsonResponse({
    preview_url: `/${locale}/atlas/preview/#token=draft-capability`,
    expires_at: 1788243600,
    version_id: versionId,
  })
}

function renderPreview() {
  const setItemLocal = vi.spyOn(Storage.prototype, 'setItem')
  const setItemSession = vi.spyOn(Storage.prototype, 'setItem')
  const { container } = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={['/atlas/7/preview']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/atlas/:versionId/preview"
              element={<AtlasPreviewPage />}
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { container, setItemLocal, setItemSession }
}

describe('AtlasPreviewPage (Plan B Task 16)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function stubFetch(
    overrides: Record<
      string,
      (url: string, init?: RequestInit) => Response
    > = {},
  ) {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        const target = String(url)
        if (target.endsWith('/auth/me')) {
          return Promise.resolve(jsonResponse(ME))
        }
        if (target.endsWith('/auth/csrf')) {
          return Promise.resolve(jsonResponse({ csrfToken: 'test-csrf' }))
        }
        const custom = overrides[target]
        if (custom) {
          return Promise.resolve(custom(target, init))
        }
        if (target.endsWith('/atlas/versions/7/preview-token')) {
          const locale =
            (JSON.parse(String(init?.body ?? '{}')) as { locale?: string })
              .locale ?? 'en'
          return Promise.resolve(tokenResponse(locale))
        }
        return Promise.resolve(
          jsonResponse({ code: 'STUB', message: `not mocked: ${target}` }, 500),
        )
      }),
    )
  }

  it('frames the returned capability URL with the fragment intact', async () => {
    stubFetch()
    const { container } = renderPreview()
    await waitFor(() => {
      expect(screen.getByTitle('Atlas 3D preview')).toBeInTheDocument()
    })
    const frame = screen.getByTitle('Atlas 3D preview') as HTMLIFrameElement
    expect(frame.getAttribute('src')).toBe(
      '/en/atlas/preview/#token=draft-capability',
    )
    expect(frame.getAttribute('src')).toContain('#token=')
    expect(frame.getAttribute('src')).not.toContain('?token=')
    expect(container.querySelector('canvas')).toBeNull()
    expect(screen.getByText(/read-only/i)).toBeInTheDocument()
  })

  it('requests a new capability when switching locale', async () => {
    stubFetch()
    renderPreview()
    await waitFor(() => {
      expect(screen.getByTitle('Atlas 3D preview')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Persian' }))
    await waitFor(() => {
      const frame = screen.getByTitle('Atlas 3D preview') as HTMLIFrameElement
      expect(frame.getAttribute('src')).toBe(
        '/fa/atlas/preview/#token=draft-capability',
      )
    })
    const posts = vi
      .mocked(fetch)
      .mock.calls.filter(([url]) =>
        String(url).endsWith('/atlas/versions/7/preview-token'),
      )
      .map(([, init]) => JSON.parse(String((init as RequestInit).body)))
    expect(posts).toEqual([{ locale: 'en' }, { locale: 'fa' }])
  })

  it('never persists the capability to storage', async () => {
    stubFetch()
    const { setItemLocal, setItemSession } = renderPreview()
    await waitFor(() => {
      expect(screen.getByTitle('Atlas 3D preview')).toBeInTheDocument()
    })
    expect(setItemLocal).not.toHaveBeenCalled()
    expect(setItemSession).not.toHaveBeenCalled()
  })

  it('labels the active projection from the URL when no preview path is served', async () => {
    stubFetch({
      '/api/v1/admin/atlas/versions/7/preview-token': () =>
        jsonResponse({
          preview_url: '/en/atlas/',
          expires_at: 1788243600,
          version_id: 7,
        }),
    })
    renderPreview()
    await waitFor(() => {
      expect(screen.getByTitle('Atlas 3D preview')).toBeInTheDocument()
    })
    expect(
      screen.getByText(/showing the active projection/i),
    ).toBeInTheDocument()
  })

  it('refuses a capability minted for a different version', async () => {
    stubFetch({
      '/api/v1/admin/atlas/versions/7/preview-token': (_url, init) => {
        const locale =
          (JSON.parse(String(init?.body ?? '{}')) as { locale?: string })
            .locale ?? 'en'
        return tokenResponse(locale, 999)
      },
    })
    renderPreview()
    await waitFor(() => {
      expect(screen.getByText(/different version/i)).toBeInTheDocument()
    })
    expect(screen.queryByTitle('Atlas 3D preview')).toBeNull()
  })
})
