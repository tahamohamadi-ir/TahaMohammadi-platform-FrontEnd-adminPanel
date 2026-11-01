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

function lastSavedPayload() {
  const putCalls = vi
    .mocked(fetch)
    .mock.calls.filter(
      ([url, init]) =>
        String(url).endsWith('/api/v1/admin/graph/versions/2/payload') &&
        (init as RequestInit | undefined)?.method === 'PUT',
    )
  const last = putCalls.at(-1)
  return last ? JSON.parse(String(last[1]?.body)) : null
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

  it('provides keyboard/table alternative to drag with coordinate controls', async () => {
    stubGraph()
    renderEdit()
    expect(
      await screen.findByRole('heading', {
        name: /node table & keyboard positioning/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('X (impact)')).toBeInTheDocument()
    expect(screen.getByLabelText('Y (impact)')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /nudge impact left/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /nudge impact right/i }),
    ).toBeInTheDocument()
  })

  it('allows editing and validating node relatedRecords', async () => {
    stubGraph()
    renderEdit()
    expect(
      await screen.findByRole('heading', { name: /related records/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /add related record to impact/i }),
    ).toBeInTheDocument()
  })
})

describe('GraphEditPage hierarchical Home graph', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults new edges to the includes relation', async () => {
    stubGraph()
    renderEdit()
    await screen.findByDisplayValue('Human impact')
    expect(screen.getByLabelText('Relation type')).toHaveValue('includes')
  })

  it('adds a node with a chosen type, colour role and summary', async () => {
    stubGraph()
    renderEdit()
    await screen.findByDisplayValue('Human impact')
    fireEvent.change(screen.getByLabelText('New Node ID'), {
      target: { value: 'software' },
    })
    fireEvent.change(screen.getByLabelText('Node Label'), {
      target: { value: 'Software Engineering' },
    })
    fireEvent.change(screen.getByLabelText('Node type'), {
      target: { value: 'field' },
    })
    fireEvent.change(screen.getByLabelText('Node color role'), {
      target: { value: 'research' },
    })
    fireEvent.change(screen.getByLabelText('Node summary'), {
      target: { value: 'Production software and data systems.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add node' }))
    fireEvent.click(screen.getByRole('button', { name: /save payload/i }))
    await waitFor(() => {
      const body = lastSavedPayload()
      expect(body).toBeTruthy()
      expect(body.nodes.at(-1)).toMatchObject({
        id: 'software',
        label: 'Software Engineering',
        type: 'field',
        colorRole: 'research',
        summary: 'Production software and data systems.',
        weight: 1,
      })
    })
  })

  it('edits the type, colour role and summary of an existing node', async () => {
    stubGraph()
    renderEdit()
    await screen.findByDisplayValue('Human impact')
    // A stored type outside the preset list stays selected, not rewritten.
    expect(screen.getByLabelText('Type (research)')).toHaveValue('domain')
    fireEvent.change(screen.getByLabelText('Type (impact)'), {
      target: { value: 'identity' },
    })
    fireEvent.change(screen.getByLabelText('Color role (impact)'), {
      target: { value: 'signature' },
    })
    fireEvent.change(screen.getByLabelText('Summary (impact)'), {
      target: { value: 'Researcher and engineer.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save payload/i }))
    await waitFor(() => {
      const body = lastSavedPayload()
      expect(body?.nodes[0]).toMatchObject({
        id: 'impact',
        type: 'identity',
        colorRole: 'signature',
        summary: 'Researcher and engineer.',
      })
      expect(body?.nodes[1]?.type).toBe('domain')
    })
  })

  it('adds a child node and its includes edge in one step', async () => {
    stubGraph()
    renderEdit()
    await screen.findByDisplayValue('Human impact')
    fireEvent.change(screen.getByLabelText('Color role (research)'), {
      target: { value: 'context' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Add child to research' }),
    )
    const dialog = screen.getByRole('dialog', {
      name: 'Add a child under research',
    })
    expect(within(dialog).getByLabelText('Child type')).toHaveValue('project')
    expect(within(dialog).getByLabelText('Child color role')).toHaveValue(
      'context',
    )
    fireEvent.change(within(dialog).getByLabelText('Child ID'), {
      target: { value: 'mlops' },
    })
    fireEvent.change(within(dialog).getByLabelText('Child label'), {
      target: { value: 'MLOps platform' },
    })
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Create child' }),
    )
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(screen.getByText(/research→mlops/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /save payload/i }))
    await waitFor(() => {
      const body = lastSavedPayload()
      expect(body?.nodes.at(-1)).toMatchObject({
        id: 'mlops',
        label: 'MLOps platform',
        accessibleLabel: 'MLOps platform',
        type: 'project',
        colorRole: 'context',
        weight: 1,
      })
      expect(typeof body?.nodes.at(-1).position.x).toBe('number')
      expect(typeof body?.nodes.at(-1).position.y).toBe('number')
      expect(body?.edges).toContainEqual({
        id: 'research->mlops:includes',
        source: 'research',
        target: 'mlops',
        relationType: 'includes',
        directed: true,
        weight: 1,
      })
    })
  })

  it('requires a unique id and a label before adding a child', async () => {
    stubGraph()
    renderEdit()
    await screen.findByDisplayValue('Human impact')
    fireEvent.click(screen.getByRole('button', { name: 'Add child to impact' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Create child' }),
    )
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      /id and label are required/i,
    )
    fireEvent.change(within(dialog).getByLabelText('Child ID'), {
      target: { value: 'research' },
    })
    fireEvent.change(within(dialog).getByLabelText('Child label'), {
      target: { value: 'Duplicate' },
    })
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Create child' }),
    )
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      /already exists/i,
    )
  })

  it('removing a parent also removes its includes edges', async () => {
    stubGraph()
    renderEdit()
    await screen.findByDisplayValue('Human impact')
    fireEvent.click(screen.getByRole('button', { name: 'Add child to impact' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Child ID'), {
      target: { value: 'cv' },
    })
    fireEvent.change(within(dialog).getByLabelText('Child label'), {
      target: { value: 'CV' },
    })
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Create child' }),
    )
    await screen.findByText(/impact→cv/i)
    fireEvent.click(screen.getByRole('button', { name: 'Remove node impact' }))
    expect(screen.queryByText(/impact→cv/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/impact→research/i)).not.toBeInTheDocument()
  })
})
