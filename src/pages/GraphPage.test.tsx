import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '@/lib/auth/AuthProvider'
import { createTestQueryClient } from '@/lib/query/client'
import { GraphPage } from '@/pages/GraphPage'

const ME = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin',
  isStaff: true,
  mfaEnrolled: true,
  otpVerified: true,
  featureFlags: {},
}

const VERSIONS = [
  {
    id: 2,
    locale: 'en',
    status: 'draft',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    nodeCount: 3,
    edgeCount: 2,
  },
  {
    id: 1,
    locale: 'en',
    status: 'active',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-15T00:00:00.000Z',
    nodeCount: 5,
    edgeCount: 4,
  },
]

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderGraph() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <AuthProvider>
          <GraphPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('GraphPage versions (ADMIN-210)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input)
          if (url.includes('/auth/me')) return Promise.resolve(jsonResponse(ME))
          if (
            init?.method === 'POST' &&
            url.endsWith('/api/v1/admin/graph/versions')
          ) {
            return Promise.resolve(jsonResponse(VERSIONS[0], 201))
          }
          if (url.includes('/activate')) {
            return Promise.resolve(jsonResponse({ id: 2, status: 'active' }))
          }
          return Promise.resolve(jsonResponse(VERSIONS))
        }),
    )
  })

  it('renders version rows with status and counts', async () => {
    renderGraph()
    const table = await screen.findByRole('table', { name: /graph versions/i })
    expect(table).toBeInTheDocument()
    expect(screen.getByText('draft')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText(/3 nodes/i)).toBeInTheDocument()
  })

  it('creates an empty draft for the chosen locale', async () => {
    renderGraph()
    await screen.findByRole('table')
    fireEvent.change(screen.getByLabelText(/locale/i), {
      target: { value: 'fa' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create draft/i }))
    await waitFor(() => {
      const createCall = vi
        .mocked(fetch)
        .mock.calls.find(
          ([url, init]) =>
            String(url).endsWith('/api/v1/admin/graph/versions') &&
            (init as RequestInit | undefined)?.method === 'POST',
        )
      expect(createCall).toBeTruthy()
      expect(JSON.parse(String(createCall![1]?.body))).toEqual({ locale: 'fa' })
    })
  })

  it('activates a draft only after confirmation', async () => {
    renderGraph()
    await screen.findByRole('table')
    const draftRow = screen.getByText('draft').closest('tr')!
    fireEvent.click(within(draftRow).getByRole('button', { name: /activate/i }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /confirm activate/i,
      }),
    )
    await waitFor(() => {
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some(
            ([url, init]) =>
              String(url).includes('/graph/versions/2/activate') &&
              (init as RequestInit | undefined)?.method === 'POST',
          ),
      ).toBe(true)
    })
  })

  it('hides activate for the active row', async () => {
    renderGraph()
    await screen.findByRole('table')
    const activeRow = screen.getByText('active').closest('tr')!
    expect(
      within(activeRow).queryByRole('button', { name: /activate/i }),
    ).not.toBeInTheDocument()
  })
})
