import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '@/lib/auth/AuthProvider'
import { createTestQueryClient } from '@/lib/query/client'
import { PublicationJobsPage } from '@/pages/PublicationJobsPage'

const ME = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin',
  isStaff: true,
  mfaEnrolled: true,
  otpVerified: true,
  featureFlags: {},
}

const JOBS_DATA = {
  count: 2,
  items: [
    {
      id: 'job-uuid-1',
      state: 'completed',
      locale: 'en',
      requestedRevision: 'rev-20260901',
      deployedRevision: 'rev-20260901',
      affectedPaths: ['/en/', '/en/research/'],
      revokedPaths: [],
      removalState: 'not_requested',
      createdAt: '2026-09-01T10:00:00Z',
      startedAt: '2026-09-01T10:00:05Z',
      finishedAt: '2026-09-01T10:01:00Z',
      errorCode: null,
      updatedAt: '2026-09-01T10:01:00Z',
    },
    {
      id: 'job-uuid-2',
      state: 'failed',
      locale: 'fa',
      requestedRevision: 'rev-20260902',
      deployedRevision: null,
      affectedPaths: [],
      revokedPaths: ['/fa/articles/old-post'],
      removalState: 'pending',
      createdAt: '2026-09-02T12:00:00Z',
      startedAt: '2026-09-02T12:00:05Z',
      finishedAt: '2026-09-02T12:00:30Z',
      errorCode: 'BUILD_TIMEOUT',
      updatedAt: '2026-09-02T12:00:30Z',
    },
  ],
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function stubJobs(
  handlers?: (url: string, init?: RequestInit) => Response | null,
) {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/auth/me')) return Promise.resolve(jsonResponse(ME))
        if (url.includes('/auth/csrf'))
          return Promise.resolve(jsonResponse({ csrfToken: 'token' }))
        const custom = handlers?.(url, init)
        if (custom) return Promise.resolve(custom)
        return Promise.resolve(jsonResponse(JOBS_DATA))
      }),
  )
}

function renderJobs() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <AuthProvider>
          <PublicationJobsPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PublicationJobsPage (PU-12-jobs)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders publication jobs list and distinguishes save from deployment', async () => {
    stubJobs()
    renderJobs()

    expect(
      await screen.findByRole('heading', { name: /publication jobs/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/save vs\. site deployment/i)).toBeInTheDocument()
    expect(screen.getByText('job-uuid-1')).toBeInTheDocument()
    expect(screen.getByText('completed')).toBeInTheDocument()
    expect(screen.getByText('job-uuid-2')).toBeInTheDocument()
    expect(screen.getByText('failed')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.getByText(/BUILD_TIMEOUT/)).toBeInTheDocument()
  })

  it('allows retrying a failed publication job', async () => {
    let retryCalled = false
    stubJobs((url, init) => {
      if (
        url.includes('/publication-jobs/job-uuid-2/retry') &&
        init?.method === 'POST'
      ) {
        retryCalled = true
        return jsonResponse({
          ...JOBS_DATA.items[1],
          state: 'queued',
          errorCode: null,
        })
      }
      return null
    })

    renderJobs()
    const retryBtn = await screen.findByRole('button', {
      name: /retry job job-uuid-2/i,
    })
    fireEvent.click(retryBtn)

    await waitFor(() => {
      expect(retryCalled).toBe(true)
    })
  })
})
