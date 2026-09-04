import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '@/lib/auth/AuthProvider'
import { createTestQueryClient } from '@/lib/query/client'
import { HomePage } from '@/pages/HomePage'

const ME = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin',
  isStaff: true,
  mfaEnrolled: true,
  otpVerified: true,
  featureFlags: {},
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
      provenance_note: 'off until graph v2',
    },
  ],
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function stubHome(
  handlers?: (url: string, init?: RequestInit) => Response | null,
) {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/auth/me')) return Promise.resolve(jsonResponse(ME))
        const custom = handlers?.(url, init)
        if (custom) return Promise.resolve(custom)
        return Promise.resolve(jsonResponse(MODULES))
      }),
  )
}

function renderHome() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <AuthProvider>
          <HomePage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('HomePage composition (ADMIN-190)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders every module slot with its visible flag and order', async () => {
    stubHome()
    renderHome()
    expect(await screen.findByText(/hero/)).toBeInTheDocument()
    expect(screen.getByText(/research-graph/)).toBeInTheDocument()
    const heroRow = screen.getByText(/hero/).closest('li')!
    expect(heroRow).toHaveTextContent('1')
  })

  it('validates via the server dry-run before saving', async () => {
    stubHome()
    renderHome()
    fireEvent.click(await screen.findByRole('button', { name: /validate/i }))
    await waitFor(() => {
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some(
            ([url, init]) =>
              String(url).includes('/home-modules/en/validate') &&
              (init as RequestInit | undefined)?.method === 'POST',
          ),
      ).toBe(true)
    })
    expect(screen.getByRole('status')).toHaveTextContent(/valid/i)
  })

  it('saves with the If-Match locale revision and reports success', async () => {
    stubHome()
    renderHome()
    fireEvent.click(
      await screen.findByRole('button', { name: /save composition/i }),
    )
    await waitFor(() => {
      const putCall = vi
        .mocked(fetch)
        .mock.calls.find(
          ([url, init]) =>
            String(url).endsWith('/api/v1/admin/home-modules/en') &&
            (init as RequestInit | undefined)?.method === 'PUT',
        )
      expect(putCall).toBeTruthy()
      expect(new Headers(putCall![1]?.headers).get('If-Match')).toBe(
        MODULES.revision,
      )
    })
    expect(screen.getByRole('status')).toHaveTextContent(/saved/i)
  })

  it('shows a reload notice when the revision went stale (409/428)', async () => {
    stubHome((_url, init) => {
      if (init?.method === 'PUT') {
        return jsonResponse(
          { code: 'STALE_REVISION', message: 'Stale composition' },
          409,
        )
      }
      return null
    })
    renderHome()
    fireEvent.click(
      await screen.findByRole('button', { name: /save composition/i }),
    )
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/reload/i)
    })
  })
})
