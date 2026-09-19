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

  it.each([
    ['/atlas', 'atlas-versions-placeholder'],
    ['/atlas/7', 'atlas-editor-placeholder'],
    ['/atlas/taxonomy', 'atlas-taxonomy-placeholder'],
    ['/atlas/7/preview', 'atlas-preview-placeholder'],
  ])('resolves %s to its protected placeholder target', async (path, id) => {
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
  })
})
