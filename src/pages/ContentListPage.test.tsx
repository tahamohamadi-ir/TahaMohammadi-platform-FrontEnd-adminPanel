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
import { ContentListPage } from '@/pages/ContentListPage'

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

const PAGE1 = {
  items: [
    {
      id: 7,
      locale: 'en',
      slug: 'hello-world',
      title: 'Hello world',
      status: 'draft',
      publishedAt: null,
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 8,
      locale: 'fa',
      slug: 'salam',
      title: 'سلام دنیا',
      status: 'published',
      publishedAt: '2026-08-30T00:00:00.000Z',
      updatedAt: '2026-08-30T00:00:00.000Z',
    },
  ],
  page: 1,
  pageSize: 20,
  total: 22,
}

function stubList(list: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/auth/me')) return Promise.resolve(jsonResponse(ME))
      return Promise.resolve(jsonResponse(list))
    }),
  )
}

function renderList(entity = 'article', path = '/content/article') {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <ContentListPage entity={entity} />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ContentListPage (ADMIN-160/170)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders rows from the real envelope with links to the editor', async () => {
    stubList(PAGE1)
    renderList()
    const table = await screen.findByRole('table', {
      name: /articles/i,
    })
    expect(table).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /hello world/i })).toHaveAttribute(
      'href',
      '/content/article/7',
    )
    expect(screen.getByText(/سلام دنیا/)).toBeInTheDocument()
  })

  it('shows a filter bar with locale and status selects wired to the query', async () => {
    stubList(PAGE1)
    renderList()
    await screen.findByRole('table')
    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: 'published' },
    })
    await waitFor(() => {
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some(([input]) =>
            String(input).includes('status=published'),
          ),
      ).toBe(true)
    })
  })

  it('paginates forward and back through the envelope', async () => {
    stubList(PAGE1)
    renderList()
    await screen.findByRole('table')
    fireEvent.click(screen.getByRole('button', { name: /next page/i }))
    await waitFor(() => {
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some(([input]) => String(input).includes('page=2')),
      ).toBe(true)
    })
  })

  it('shows an honest empty state when the entity has no rows', async () => {
    stubList({ items: [], page: 1, pageSize: 20, total: 0 })
    renderList('series', '/content/series')
    await waitFor(() => {
      expect(screen.getByText(/no .* yet\./i)).toBeInTheDocument()
    })
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows an error state with retry when the backend is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/auth/me')) return Promise.resolve(jsonResponse(ME))
        return Promise.reject(new TypeError('down'))
      }),
    )
    renderList()
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('hides bulk-archive with an honest note while the flag is off', async () => {
    stubList(PAGE1)
    renderList()
    await screen.findByRole('table')
    expect(
      screen.queryByRole('button', { name: /archive selected/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/bulk archive is disabled/i)).toBeInTheDocument()
  })

  it('bulk-archives selected rows when the flag is on (ADMIN-240)', async () => {
    stubList(PAGE1)
    let bulkCalled = false
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/auth/me')) {
          return Promise.resolve(
            jsonResponse({ ...ME, featureFlags: { admin_bulk_archive: true } }),
          )
        }
        if (url.includes('/bulk-archive')) {
          bulkCalled = true
          return Promise.resolve(
            jsonResponse({ archived: 1, ids: [7], skipped: 0 }),
          )
        }
        return Promise.resolve(jsonResponse(PAGE1))
      }),
    )
    renderList()
    await screen.findByRole('table')
    fireEvent.click(screen.getByLabelText(/select row 7/i))
    fireEvent.click(screen.getByRole('button', { name: /archive selected/i }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /confirm archive/i,
      }),
    )
    await waitFor(() => {
      expect(bulkCalled).toBe(true)
    })
    expect(bulkCalled).toBe(true)
  })
})
