import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestQueryClient } from '@/lib/query/client'
import { AuthProvider } from '@/lib/auth/AuthProvider'
import { DashboardPage } from '@/pages/DashboardPage'

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

function stubDashboard(summary: unknown, health: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/auth/me')) {
        return Promise.resolve(jsonResponse(ME))
      }
      if (String(url).includes('/overview/content-health')) {
        return Promise.resolve(jsonResponse(health))
      }
      return Promise.resolve(jsonResponse(summary))
    }),
  )
}

function renderDashboard() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const SUMMARY = { drafts: 3, published: 12, contentCounts: { articles: 10 } }
const HEALTHY = {
  drafts: 7,
  published: 9,
  archived: 0,
  review: 0,
  scheduled: 0,
  incompleteTranslations: 0,
  missingAltMedia: 0,
  orphanMedia: 0,
}

describe('DashboardPage health (ADMIN-140)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows action-oriented counts from the dashboard summary', async () => {
    stubDashboard(SUMMARY, HEALTHY)
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()
    })
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('warns when media health indicators are degraded', async () => {
    stubDashboard(SUMMARY, { ...HEALTHY, missingAltMedia: 2, orphanMedia: 1 })
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/media/i)
    })
  })

  it('shows an error state with retry when the backend is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (String(url).includes('/auth/me')) {
          return Promise.resolve(jsonResponse(ME))
        }
        return Promise.reject(new TypeError('down'))
      }),
    )
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
