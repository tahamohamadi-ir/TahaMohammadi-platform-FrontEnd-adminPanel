import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { QueryClientProvider } from '@tanstack/react-query'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AuthProvider } from '@/lib/auth/AuthProvider'
import { createTestQueryClient } from '@/lib/query/client'

function staffMe(featureFlags: Record<string, boolean> = {}) {
  return {
    id: 1,
    email: 'admin@example.com',
    displayName: 'Admin',
    isStaff: true,
    mfaEnrolled: true,
    otpVerified: true,
    featureFlags,
  }
}

function renderRoute(ui: React.ReactNode) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={['/settings']}>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProtectedRoute authorization (ADMIN-130)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders children for staff users', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(staffMe()), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    renderRoute(
      <ProtectedRoute requireStaff>
        <p>Settings body</p>
      </ProtectedRoute>,
    )
    await waitFor(() => {
      expect(screen.getByText('Settings body')).toBeInTheDocument()
    })
  })

  it('shows a forbidden state for non-staff users instead of the page', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ ...staffMe(), isStaff: false }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
    )
    renderRoute(
      <ProtectedRoute requireStaff>
        <p>Settings body</p>
      </ProtectedRoute>,
    )
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Forbidden' }),
      ).toBeInTheDocument()
    })
    expect(screen.queryByText('Settings body')).not.toBeInTheDocument()
  })

  it('shows a forbidden state when the required feature flag is off', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(staffMe({})), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    renderRoute(
      <ProtectedRoute featureFlag="media-library">
        <p>Media body</p>
      </ProtectedRoute>,
    )
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Forbidden' }),
      ).toBeInTheDocument()
    })
    expect(screen.queryByText('Media body')).not.toBeInTheDocument()
  })
})
