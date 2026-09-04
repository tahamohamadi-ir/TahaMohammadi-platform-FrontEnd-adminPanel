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
import { TimelinePage } from '@/pages/TimelinePage'

const ME = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin',
  isStaff: true,
  mfaEnrolled: true,
  otpVerified: true,
  featureFlags: {},
}

const ROWS = {
  items: [
    {
      id: 3,
      type: 'job',
      label: 'Backend engineer',
      period_label: '2020—2024',
      body: '',
      role: '',
      weight: 0,
      detail_url: '',
      order: 1,
      attach: null,
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 4,
      type: 'education',
      label: 'MSc',
      period_label: '2016—2020',
      body: '',
      role: '',
      weight: 0,
      detail_url: '',
      order: 2,
      attach: null,
      updatedAt: '2026-08-30T00:00:00.000Z',
    },
  ],
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function stubTimeline(
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
        return Promise.resolve(jsonResponse(ROWS))
      }),
  )
}

function renderTimeline() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <AuthProvider>
          <TimelinePage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TimelinePage (ADMIN-200)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders ordered rows', async () => {
    stubTimeline()
    renderTimeline()
    expect(await screen.findByText(/backend engineer/i)).toBeInTheDocument()
    expect(screen.getByText(/msc/i)).toBeInTheDocument()
  })

  it('creates a record through the real create op', async () => {
    stubTimeline()
    renderTimeline()
    await screen.findByText(/backend engineer/i)
    fireEvent.change(screen.getByLabelText(/new label/i), {
      target: { value: 'Freelance' },
    })
    fireEvent.change(screen.getByLabelText(/new type/i), {
      target: { value: 'job' },
    })
    fireEvent.click(screen.getByRole('button', { name: /add record/i }))
    await waitFor(() => {
      const createCall = vi
        .mocked(fetch)
        .mock.calls.find(
          ([url, init]) =>
            String(url).endsWith('/api/v1/admin/timeline/en') &&
            (init as RequestInit | undefined)?.method === 'POST',
        )
      expect(createCall).toBeTruthy()
      expect(JSON.parse(String(createCall![1]?.body))).toMatchObject({
        label: 'Freelance',
        type: 'job',
      })
    })
  })

  it('reorders with the full id permutation via move buttons', async () => {
    stubTimeline()
    renderTimeline()
    await screen.findByText(/backend engineer/i)
    const secondRow = screen.getByText(/msc/i).closest('li')!
    fireEvent.click(within(secondRow).getByRole('button', { name: /move up/i }))
    await waitFor(() => {
      const reorderCall = vi
        .mocked(fetch)
        .mock.calls.find(([url]) =>
          String(url).includes('/timeline/en/reorder'),
        )
      expect(reorderCall).toBeTruthy()
      expect(JSON.parse(String(reorderCall![1]?.body))).toEqual({ ids: [4, 3] })
    })
  })

  it('patches edits with If-Match row revision', async () => {
    stubTimeline()
    renderTimeline()
    await screen.findByText(/backend engineer/i)
    const firstRow = screen.getByText(/backend engineer/i).closest('li')!
    fireEvent.click(within(firstRow).getByRole('button', { name: /edit/i }))
    fireEvent.change(screen.getByLabelText(/^label$/i), {
      target: { value: 'Senior engineer' },
    })
    fireEvent.click(within(firstRow).getByRole('button', { name: /save row/i }))
    await waitFor(() => {
      const patchCall = vi
        .mocked(fetch)
        .mock.calls.find(
          ([url, init]) =>
            String(url).endsWith('/api/v1/admin/timeline/en/3') &&
            (init as RequestInit | undefined)?.method === 'PATCH',
        )
      expect(patchCall).toBeTruthy()
      expect(new Headers(patchCall![1]?.headers).get('If-Match')).toBe(
        ROWS.items[0].updatedAt,
      )
      expect(JSON.parse(String(patchCall![1]?.body))).toEqual({
        label: 'Senior engineer',
      })
    })
  })

  it('deletes with confirmation and If-Match', async () => {
    stubTimeline()
    renderTimeline()
    await screen.findByText(/backend engineer/i)
    const firstRow = screen.getByText(/backend engineer/i).closest('li')!
    fireEvent.click(within(firstRow).getByRole('button', { name: /delete/i }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /confirm delete/i,
      }),
    )
    await waitFor(() => {
      const deleteCall = vi
        .mocked(fetch)
        .mock.calls.find(
          ([url, init]) =>
            String(url).endsWith('/api/v1/admin/timeline/en/3') &&
            (init as RequestInit | undefined)?.method === 'DELETE',
        )
      expect(deleteCall).toBeTruthy()
      expect(new Headers(deleteCall![1]?.headers).get('If-Match')).toBe(
        ROWS.items[0].updatedAt,
      )
    })
  })
})
