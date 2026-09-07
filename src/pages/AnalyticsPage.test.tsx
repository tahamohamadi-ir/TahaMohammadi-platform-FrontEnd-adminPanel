import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '@/lib/auth/AuthProvider'
import { createTestQueryClient } from '@/lib/query/client'
import { AnalyticsPage } from '@/pages/AnalyticsPage'

const ME = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin',
  isStaff: true,
  mfaEnrolled: true,
  otpVerified: true,
  featureFlags: {},
}

const ANALYTICS_DATA = {
  from: '2026-08-01',
  to: '2026-09-01',
  timezone: 'UTC',
  updatedAt: '2026-09-01T12:00:00Z',
  metric: 'received_events',
  rows: [
    {
      date: '2026-08-15',
      pagePath: '/en/research',
      locale: 'en',
      event: 'page_view',
      target: '',
      count: 42,
    },
    {
      date: '2026-08-16',
      pagePath: '/en/cv',
      locale: 'en',
      event: 'cv_download',
      target: 'academic_cv',
      count: 7,
    },
  ],
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function stubAnalytics(
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
        return Promise.resolve(jsonResponse(ANALYTICS_DATA))
      }),
  )
}

function renderAnalytics() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <AuthProvider>
          <AnalyticsPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AnalyticsPage (PU-22-analytics)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders event counts and metric definitions', async () => {
    stubAnalytics()
    renderAnalytics()

    expect(
      await screen.findByRole('heading', { name: /analytics/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/metric definitions & privacy notice/i),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/received events/i).length).toBeGreaterThan(0)
    expect(screen.getByText('/en/research')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getAllByText('academic_cv').length).toBeGreaterThan(0)
  })

  it('renders empty state when no events exist for the range', async () => {
    stubAnalytics((url) => {
      if (url.includes('/analytics')) {
        return jsonResponse({ ...ANALYTICS_DATA, rows: [] })
      }
      return null
    })
    renderAnalytics()

    expect(await screen.findByText(/no events recorded/i)).toBeInTheDocument()
  })

  it('renders not-connected state when backend analytics endpoint is unavailable (404)', async () => {
    stubAnalytics((url) => {
      if (url.includes('/analytics')) {
        return jsonResponse({ code: 'NOT_FOUND', message: 'Not found' }, 404)
      }
      return null
    })
    renderAnalytics()

    expect(
      await screen.findByText(/analytics service not connected/i),
    ).toBeInTheDocument()
  })

  it('renders error state with retry when server fails (500)', async () => {
    stubAnalytics((url) => {
      if (url.includes('/analytics')) {
        return jsonResponse(
          { code: 'SERVER_ERROR', message: 'Database failure' },
          500,
        )
      }
      return null
    })
    renderAnalytics()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /failed to load analytics/i,
    )
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
