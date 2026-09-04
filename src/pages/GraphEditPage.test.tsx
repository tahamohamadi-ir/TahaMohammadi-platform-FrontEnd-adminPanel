import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '@/lib/auth/AuthProvider'
import { createTestQueryClient } from '@/lib/query/client'
import { GraphEditPage } from '@/pages/GraphEditPage'

const ME = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin',
  isStaff: true,
  mfaEnrolled: true,
  otpVerified: true,
  featureFlags: {},
}

const DETAIL = {
  id: 2,
  locale: 'en',
  status: 'draft',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  nodes: [
    {
      id: 'impact',
      type: 'domain',
      label: 'Human impact',
      accessibleLabel: 'Human impact node',
      colorRole: 'brand',
      iconRole: 'center',
      weight: 5,
      position: { x: 200, y: 200 },
      relatedRecords: [],
    },
    {
      id: 'research',
      type: 'domain',
      label: 'Research',
      accessibleLabel: 'Research node',
      colorRole: 'brand',
      iconRole: 'orbit',
      weight: 3,
      position: { x: 300, y: 240 },
      relatedRecords: [],
    },
  ],
  edges: [
    {
      id: 'impact->research',
      source: 'impact',
      target: 'research',
      relationType: 'supports',
      directed: true,
      weight: 1,
    },
  ],
  groups: [{ name: 'Core', nodeIds: ['impact'] }],
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function stubGraph(
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
        return Promise.resolve(jsonResponse(DETAIL))
      }),
  )
}

function renderEdit() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={['/graph/2']}>
        <AuthProvider>
          <Routes>
            <Route path="graph/:versionId" element={<GraphEditPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('GraphEditPage (ADMIN-210)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the draft payload and lists nodes, edges, groups', async () => {
    stubGraph()
    renderEdit()
    expect(await screen.findByDisplayValue('Human impact')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Research')).toBeInTheDocument()
    expect(screen.getByText(/impact→research/i)).toBeInTheDocument()
    expect(screen.getByText(/core/i)).toBeInTheDocument()
    expect(screen.getByText(/draft/i)).toBeInTheDocument()
  })

  it('edits a node label and saves with If-Match version revision', async () => {
    stubGraph()
    renderEdit()
    const label = await screen.findByDisplayValue('Human impact')
    fireEvent.change(label, { target: { value: 'Human impact first' } })
    fireEvent.click(screen.getByRole('button', { name: /save payload/i }))
    await waitFor(() => {
      const putCall = vi
        .mocked(fetch)
        .mock.calls.find(
          ([url, init]) =>
            String(url).endsWith('/api/v1/admin/graph/versions/2/payload') &&
            (init as RequestInit | undefined)?.method === 'PUT',
        )
      expect(putCall).toBeTruthy()
      expect(new Headers(putCall![1]?.headers).get('If-Match')).toBe(
        DETAIL.updatedAt,
      )
      const body = JSON.parse(String(putCall![1]?.body))
      expect(body.nodes[0]?.label).toBe('Human impact first')
      expect(body.edges).toHaveLength(1)
      expect(body.groups).toHaveLength(1)
    })
  })

  it('adds the reverse direction of an existing edge', async () => {
    stubGraph()
    renderEdit()
    await screen.findByDisplayValue('Human impact')
    fireEvent.click(
      screen.getByRole('button', { name: /add reverse direction/i }),
    )
    await waitFor(() => {
      expect(screen.getAllByText(/research→impact/i).length).toBeGreaterThan(0)
    })
  })

  it('shows the validator report issues', async () => {
    stubGraph((url) => {
      if (url.includes('/graph/validation/2')) {
        return jsonResponse({
          issues: [{ code: 'MISSING_POSITION', nodeId: 'research' }],
        })
      }
      return null
    })
    renderEdit()
    fireEvent.click(
      await screen.findByRole('button', { name: /run validation/i }),
    )
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/MISSING_POSITION/)
    expect(alert).toHaveTextContent(/research/)
  })
})
