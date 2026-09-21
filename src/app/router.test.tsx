import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppRouter } from '@/app/router'
import { AuthProvider } from '@/lib/auth/AuthProvider'
import { createTestQueryClient } from '@/lib/query/client'
import { QueryClientProvider } from '@tanstack/react-query'

describe('AppRouter', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 401,
        }),
      ),
    )
  })

  it('redirects unauthenticated users from dashboard to sign-in', async () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Sign in' }),
      ).toBeInTheDocument()
    })
  })
})

describe('Atlas routes (Plan B Task 9)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    )
  })

  const ATLAS_PATHS = [
    '/atlas',
    '/atlas/7',
    '/atlas/taxonomy',
    '/atlas/7/preview',
  ] as const

  it.each(ATLAS_PATHS)(
    'redirects unauthenticated users from %s to sign-in',
    async (path) => {
      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter initialEntries={[path]}>
            <AuthProvider>
              <AppRouter />
            </AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>,
      )
      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'Sign in' }),
        ).toBeInTheDocument()
      })
    },
  )
})
describe('Atlas route resolution (Plan B Task 9 fix)', () => {
  const AUTHED = {
    id: 1,
    email: 'admin@example.com',
    displayName: 'Admin',
    isStaff: true,
    mfaEnrolled: true,
    otpVerified: true,
    featureFlags: {},
  }

  it.each([['/atlas/7/preview', 'atlas-preview-placeholder']])(
    'resolves %s to its protected placeholder target',
    async (path, id) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(() =>
          Promise.resolve(
            new Response(JSON.stringify(AUTHED), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }),
          ),
        ),
      )
      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter initialEntries={[path]}>
            <AuthProvider>
              <AppRouter />
            </AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>,
      )
      await waitFor(() => {
        expect(screen.getByTestId(id)).toBeInTheDocument()
      })
    },
  )
})

describe('Atlas versions route (Plan B Task 10)', () => {
  const AUTHED = {
    id: 1,
    email: 'admin@example.com',
    displayName: 'Admin',
    isStaff: true,
    mfaEnrolled: true,
    otpVerified: true,
    featureFlags: {},
  }

  it('resolves /atlas to the versions page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) =>
        Promise.resolve(
          new Response(
            JSON.stringify(String(url).endsWith('/auth/me') ? AUTHED : []),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          ),
        ),
      ),
    )
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter initialEntries={['/atlas']}>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Atlas versions' }),
      ).toBeInTheDocument()
    })
  })
})

describe('Atlas editor route (Plan B Task 11)', () => {
  const AUTHED = {
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

  it('resolves /atlas/7 to the editor host', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        const target = String(url)
        if (target.endsWith('/auth/me')) {
          return Promise.resolve(jsonResponse(AUTHED))
        }
        if (target.endsWith('/atlas/versions/7')) {
          return Promise.resolve(
            jsonResponse({
              id: 7,
              label: 'Draft',
              status: 'draft',
              nodeCount: 0,
              relationCount: 0,
              revision: '7-2026-09-19T00:00:00+00:00',
              createdAt: '2026-09-19T00:00:00+00:00',
              updatedAt: '2026-09-19T00:00:00+00:00',
            }),
          )
        }
        if (
          target.endsWith('/atlas/versions/7/nodes') ||
          target.endsWith('/atlas/versions/7/relations') ||
          target.endsWith('/atlas/versions/7/groups')
        ) {
          return Promise.resolve(jsonResponse([]))
        }
        if (target.endsWith('/atlas/node-types')) {
          return Promise.resolve(jsonResponse([]))
        }
        if (target.endsWith('/atlas/relation-types')) {
          return Promise.resolve(jsonResponse([]))
        }
        return Promise.resolve(jsonResponse({ detail: 'unused' }, 500))
      }),
    )
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter initialEntries={['/atlas/7']}>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Atlas editor' }),
      ).toBeInTheDocument()
    })
  })
})

describe('Atlas taxonomy route (Plan B Task 13)', () => {
  const AUTHED = {
    id: 1,
    email: 'admin@example.com',
    displayName: 'Admin',
    isStaff: true,
    mfaEnrolled: true,
    otpVerified: true,
    featureFlags: {},
  }

  it('resolves /atlas/taxonomy to the taxonomy page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) =>
        Promise.resolve(
          new Response(
            JSON.stringify(String(url).endsWith('/auth/me') ? AUTHED : []),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          ),
        ),
      ),
    )
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter initialEntries={['/atlas/taxonomy']}>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Atlas taxonomy' }),
      ).toBeInTheDocument()
    })
  })
})
