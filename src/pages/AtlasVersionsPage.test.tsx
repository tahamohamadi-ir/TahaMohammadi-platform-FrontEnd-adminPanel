import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '@/lib/auth/AuthProvider'
import { createTestQueryClient } from '@/lib/query/client'
import { AtlasVersionsPage } from '@/pages/AtlasVersionsPage'

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
    label: 'Draft v2',
    status: 'draft',
    nodeCount: 3,
    relationCount: 1,
    revision: '2-2026-09-18T00:00:00+00:00',
    createdAt: '2026-09-17T00:00:00+00:00',
    updatedAt: '2026-09-18T00:00:00+00:00',
  },
  {
    id: 1,
    label: 'Live',
    status: 'active',
    nodeCount: 5,
    relationCount: 4,
    revision: '1-2026-09-10T00:00:00+00:00',
    createdAt: '2026-09-01T00:00:00+00:00',
    updatedAt: '2026-09-10T00:00:00+00:00',
  },
  {
    id: 3,
    label: 'Old',
    status: 'archived',
    nodeCount: 2,
    relationCount: 0,
    revision: '3-2026-09-05T00:00:00+00:00',
    createdAt: '2026-09-01T00:00:00+00:00',
    updatedAt: '2026-09-05T00:00:00+00:00',
  },
]

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function EditorProbe() {
  const { versionId } = useParams()
  return <div data-testid="editor-probe">editor:{versionId}</div>
}

function renderPage() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={['/atlas']}>
        <AuthProvider>
          <Routes>
            <Route path="/atlas" element={<AtlasVersionsPage />} />
            <Route path="/atlas/:versionId" element={<EditorProbe />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AtlasVersionsPage (Plan B Task 10)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch(
    versions: unknown[] = VERSIONS,
    overrides: Record<string, (url: string) => Response> = {},
  ) {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        const target = String(url)
        if (target.endsWith('/auth/me')) {
          return Promise.resolve(jsonResponse(ME))
        }
        if (target.endsWith('/auth/csrf')) {
          return Promise.resolve(jsonResponse({ csrfToken: 'test-csrf' }))
        }
        const custom = overrides[target]
        if (custom) {
          return Promise.resolve(custom(target))
        }
        if (target.endsWith('/atlas/versions') && init?.method === 'POST') {
          const label = JSON.parse(String(init.body)).label as string
          return Promise.resolve(
            jsonResponse(
              {
                id: 9,
                label,
                status: 'draft',
                nodeCount: 0,
                relationCount: 0,
                revision: '9-2026-09-19T00:00:00+00:00',
                createdAt: '2026-09-19T00:00:00+00:00',
                updatedAt: '2026-09-19T00:00:00+00:00',
              },
              201,
            ),
          )
        }
        const cloneMatch = target.match(/\/atlas\/versions\/(\d+)\/clone$/)
        if (cloneMatch && init?.method === 'POST') {
          const label = JSON.parse(String(init.body)).label as string
          return Promise.resolve(
            jsonResponse(
              {
                id: 10,
                label,
                status: 'draft',
                nodeCount: 5,
                relationCount: 4,
                revision: '10-2026-09-19T00:00:00+00:00',
                createdAt: '2026-09-19T00:00:00+00:00',
                updatedAt: '2026-09-19T00:00:00+00:00',
              },
              201,
            ),
          )
        }
        if (target.endsWith('/atlas/versions')) {
          return Promise.resolve(jsonResponse(versions))
        }
        return Promise.resolve(
          jsonResponse({ code: 'STUB', message: `not mocked: ${target}` }, 500),
        )
      }),
    )
  }

  it('renders one row per version with counts', async () => {
    stubFetch()
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Draft v2')).toBeInTheDocument()
    })
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.getByText('Old')).toBeInTheDocument()
    const draftRow = screen.getByText('Draft v2').closest('tr') as HTMLElement
    expect(within(draftRow).getByText('3')).toBeInTheDocument()
    expect(within(draftRow).getByText('1')).toBeInTheDocument()
  })

  it('marks the active row and limits it to Clone and Open preview', async () => {
    stubFetch()
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Live')).toBeInTheDocument()
    })
    const activeRow = screen.getByText('Live').closest('tr') as HTMLElement
    expect(within(activeRow).getByText('Active')).toBeInTheDocument()
    expect(
      within(activeRow).getByRole('button', { name: 'Clone to draft' }),
    ).toBeInTheDocument()
    const preview = within(activeRow).getByRole('link', {
      name: 'Open preview',
    })
    expect(preview.getAttribute('href')).toBe('/atlas/1/preview')
    expect(
      within(activeRow).queryByRole('link', { name: 'Open editor' }),
    ).not.toBeInTheDocument()
  })

  it('gives the draft row an editor link and clone action', async () => {
    stubFetch()
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Draft v2')).toBeInTheDocument()
    })
    const draftRow = screen.getByText('Draft v2').closest('tr') as HTMLElement
    const editor = within(draftRow).getByRole('link', { name: 'Open editor' })
    expect(editor.getAttribute('href')).toBe('/atlas/2')
    expect(
      within(draftRow).getByRole('button', { name: 'Clone to draft' }),
    ).toBeInTheDocument()
  })

  it('offers no editor control on the archived row', async () => {
    stubFetch()
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Old')).toBeInTheDocument()
    })
    const archivedRow = screen.getByText('Old').closest('tr') as HTMLElement
    expect(
      within(archivedRow).queryByRole('link', { name: 'Open editor' }),
    ).not.toBeInTheDocument()
    expect(
      within(archivedRow).getByRole('button', { name: 'Clone to draft' }),
    ).toBeInTheDocument()
  })

  it('clone posts the source id and navigates to the new draft editor', async () => {
    stubFetch()
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Live')).toBeInTheDocument()
    })
    const activeRow = screen.getByText('Live').closest('tr') as HTMLElement
    fireEvent.click(
      within(activeRow).getByRole('button', { name: 'Clone to draft' }),
    )
    await waitFor(() => {
      expect(screen.getByTestId('editor-probe')).toHaveTextContent('editor:10')
    })
    const calls = vi.mocked(fetch).mock.calls as [string, RequestInit][]
    const cloneCall = calls.find(([url]) =>
      String(url).endsWith('/atlas/versions/1/clone'),
    )
    expect(cloneCall).toBeDefined()
    expect(cloneCall?.[1].method).toBe('POST')
    expect(JSON.parse(String(cloneCall?.[1].body))).toEqual({
      label: 'Copy of Live',
    })
  })

  it('create draft posts the label and navigates to the new editor', async () => {
    stubFetch()
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Draft v2')).toBeInTheDocument()
    })
    fireEvent.change(screen.getByLabelText('New draft label'), {
      target: { value: 'Q4 atlas' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }))
    await waitFor(() => {
      expect(screen.getByTestId('editor-probe')).toHaveTextContent('editor:9')
    })
    const calls = vi.mocked(fetch).mock.calls as [string, RequestInit][]
    const createCall = calls.find(
      ([url, init]) =>
        String(url).endsWith('/atlas/versions') && init?.method === 'POST',
    )
    expect(createCall).toBeDefined()
    expect(JSON.parse(String(createCall?.[1].body))).toEqual({
      label: 'Q4 atlas',
    })
  })

  it('shows the empty state when no versions exist', async () => {
    stubFetch([])
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('No Atlas versions yet.')).toBeInTheDocument()
    })
  })

  it('shows the backend message when the versions query fails', async () => {
    stubFetch([], {
      '/api/v1/admin/atlas/versions': () =>
        jsonResponse(
          { code: 'UNKNOWN', message: 'Database unavailable.' },
          500,
        ),
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Database unavailable.')).toBeInTheDocument()
    })
  })

  it('surfaces the backend message when clone finds the source gone', async () => {
    stubFetch(VERSIONS, {
      '/api/v1/admin/atlas/versions/1/clone': () =>
        jsonResponse(
          { code: 'NOT_FOUND', message: 'Atlas version not found.' },
          404,
        ),
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Live')).toBeInTheDocument()
    })
    const activeRow = screen.getByText('Live').closest('tr') as HTMLElement
    fireEvent.click(
      within(activeRow).getByRole('button', { name: 'Clone to draft' }),
    )
    await waitFor(() => {
      expect(screen.getByText('Atlas version not found.')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('editor-probe')).not.toBeInTheDocument()
  })
})
