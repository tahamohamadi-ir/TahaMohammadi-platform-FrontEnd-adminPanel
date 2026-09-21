import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '@/lib/auth/AuthProvider'
import type { AtlasNodeTypeRow, AtlasRelationTypeRow } from '@/lib/api/atlas'
import { createTestQueryClient } from '@/lib/query/client'
import { AtlasTaxonomyPage } from '@/pages/AtlasTaxonomyPage'

const ME = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin',
  isStaff: true,
  mfaEnrolled: true,
  otpVerified: true,
  featureFlags: {},
}

const NODE_TYPES: AtlasNodeTypeRow[] = [
  {
    key: 'project',
    label_en: 'Project',
    label_fa: 'پروژه',
    active: true,
    sort_order: 0,
    defaultImportance: 50,
    canonicalSource: 'project',
  },
  {
    key: 'method',
    label_en: 'Method',
    label_fa: 'روش',
    active: false,
    sort_order: 1,
    defaultImportance: 50,
    canonicalSource: 'method',
  },
]

const RELATION_TYPES: AtlasRelationTypeRow[] = [
  {
    key: 'uses',
    label_en: 'Uses',
    label_fa: 'استفاده می‌کند',
    active: true,
    sort_order: 0,
    canonicalSource: 'none',
    defaultImportance: 50,
    directedDefault: true,
    overridableDirection: false,
    hierarchyRole: true,
    allowedSourceTypes: ['project'],
    allowedTargetTypes: ['method'],
  },
]

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderPage() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={['/atlas/taxonomy']}>
        <AuthProvider>
          <Routes>
            <Route path="/atlas/taxonomy" element={<AtlasTaxonomyPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AtlasTaxonomyPage (Plan B Task 13)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch(
    overrides: Record<
      string,
      (url: string, init?: RequestInit) => Response
    > = {},
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
          return Promise.resolve(custom(target, init))
        }
        if (target.endsWith('/atlas/node-types')) {
          return Promise.resolve(jsonResponse(NODE_TYPES))
        }
        if (target.endsWith('/atlas/relation-types')) {
          return Promise.resolve(jsonResponse(RELATION_TYPES))
        }
        return Promise.resolve(
          jsonResponse({ code: 'STUB', message: `not mocked: ${target}` }, 500),
        )
      }),
    )
  }

  it('lists node and relation types with retired and hierarchy states', async () => {
    stubFetch()
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Project')).toBeInTheDocument()
    })
    expect(screen.getByText('Uses')).toBeInTheDocument()
    const methodRow = screen.getByText('method').closest('tr') as HTMLElement
    expect(within(methodRow).getByText('Retired')).toBeInTheDocument()
    const usesRow = screen.getByText('uses').closest('tr') as HTMLElement
    expect(within(usesRow).getByText(/hierarchy/i)).toBeInTheDocument()
  })

  it('creates a node type through the taxonomy client', async () => {
    stubFetch({
      '/api/v1/admin/atlas/node-types': (_url, init) =>
        init?.method === 'POST'
          ? jsonResponse(NODE_TYPES[0], 201)
          : jsonResponse(NODE_TYPES),
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Project')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'New node type' }))
    fireEvent.change(screen.getByLabelText('Key'), {
      target: { value: 'project' },
    })
    fireEvent.change(screen.getByLabelText('English label'), {
      target: { value: 'Project' },
    })
    fireEvent.change(screen.getByLabelText('Persian label'), {
      target: { value: 'پروژه' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create node type' }))
    await waitFor(() => {
      const created = vi
        .mocked(fetch)
        .mock.calls.filter(
          ([url, init]) =>
            String(url).endsWith('/atlas/node-types') &&
            (init as RequestInit)?.method === 'POST',
        )
      expect(created.length).toBeGreaterThan(0)
    })
  })

  it('opens the relation-type edit form from the table', async () => {
    stubFetch()
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Uses')).toBeInTheDocument()
    })
    const usesRow = screen.getByText('uses').closest('tr') as HTMLElement
    fireEvent.click(within(usesRow).getByRole('button', { name: 'Edit' }))
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Save relation type' }),
      ).toBeInTheDocument()
    })
  })

  it('renders empty states for an empty taxonomy', async () => {
    stubFetch({
      '/api/v1/admin/atlas/node-types': () => jsonResponse([]),
      '/api/v1/admin/atlas/relation-types': () => jsonResponse([]),
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('No node types yet.')).toBeInTheDocument()
    })
    expect(screen.getByText('No relation types yet.')).toBeInTheDocument()
  })

  it('renders the query error without a table', async () => {
    stubFetch({
      '/api/v1/admin/atlas/node-types': () =>
        jsonResponse({ code: 'FORBIDDEN', message: 'Staff only.' }, 403),
      '/api/v1/admin/atlas/relation-types': () => jsonResponse([]),
    })
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByText('Failed to load the Atlas taxonomy'),
      ).toBeInTheDocument()
    })
    expect(screen.queryByRole('table')).toBeNull()
  })
})
