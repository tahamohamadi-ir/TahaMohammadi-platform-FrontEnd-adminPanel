import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '@/lib/auth/AuthProvider'
import { createTestQueryClient } from '@/lib/query/client'
import { ApprovalQueuePage } from '@/pages/ApprovalQueuePage'

const ME = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin',
  isStaff: true,
  mfaEnrolled: true,
  otpVerified: true,
  featureFlags: {},
}

const QUEUE = {
  items: [
    {
      contentId: 'profile.identity.en',
      contentType: 'profile_identity',
      locale: 'en',
      slug: 'taha-mohammadi',
      title: 'Taha Mohammadi',
      approvalState: 'needs-owner-input',
      publicationState: 'draft',
      visibility: 'public',
      isPublicationAllowed: false,
    },
  ],
  counts: { total: 66, approved: 4, notApproved: 62 },
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderQueue() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <AuthProvider>
          <ApprovalQueuePage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ApprovalQueuePage (ADMIN-260/270)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/auth/me')) return Promise.resolve(jsonResponse(ME))
        return Promise.resolve(jsonResponse(QUEUE))
      }),
    )
  })

  it('renders queue rows with approval states and honest counts', async () => {
    renderQueue()
    const table = await screen.findByRole('table', {
      name: /owner approval queue/i,
    })
    expect(table).toBeInTheDocument()
    expect(screen.getByText('profile.identity.en')).toBeInTheDocument()
    expect(screen.getByText(/needs-owner-input/)).toBeInTheDocument()
    expect(screen.getByText(/blocked/)).toBeInTheDocument()
    expect(
      screen.getByText(/62 of 66 records still need owner input/),
    ).toBeInTheDocument()
  })

  it('stays read-only: no mutation controls anywhere', async () => {
    renderQueue()
    await screen.findByRole('table')
    expect(
      screen.queryByRole('button', { name: /approve/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /publish/i }),
    ).not.toBeInTheDocument()
  })

  it('re-queries with the chosen state filter', async () => {
    renderQueue()
    await screen.findByRole('table')
    const select = screen.getByLabelText(/approval state/i)
    fireEvent.change(select, { target: { value: 'approved' } })
    await waitFor(() => {
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some(([input]) =>
            String(input).includes('/approval-queue?state=approved'),
          ),
      ).toBe(true)
    })
  })
})
