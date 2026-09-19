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
