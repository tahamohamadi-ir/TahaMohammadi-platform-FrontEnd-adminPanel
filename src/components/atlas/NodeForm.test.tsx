import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NodeForm } from '@/components/atlas/NodeForm'
import type {
  AtlasGroupRow,
  AtlasNodeRow,
  AtlasNodeTypeRow,
} from '@/lib/api/atlas'
import { createTestQueryClient } from '@/lib/query/client'

const NODE_TYPES: AtlasNodeTypeRow[] = [
  {
    key: 'topic',
    label_en: 'Topic',
    label_fa: 'موضوع',
    active: true,
    sort_order: 0,
    defaultImportance: 50,
    canonicalSource: 'none',
  },
  {
    key: 'retired',
    label_en: 'Retired',
    label_fa: 'بازنشسته',
    active: false,
    sort_order: 1,
    defaultImportance: 50,
    canonicalSource: 'none',
  },
]

const GROUPS: AtlasGroupRow[] = [
  { key: 'g1', label: 'Group one', memberKeys: [] },
  { key: 'g2', label: 'Group two', memberKeys: [] },
]

function node(overrides: Partial<AtlasNodeRow> = {}): AtlasNodeRow {
  return {
    publicKey: 'topic-1',
    nodeTypeKey: 'topic',
    canonicalSource: 'research_topic',
    canonicalTranslationKey: 'pars-sql',
    groupKeys: [],
    importance: 50,
    localeStatus: { en: true, fa: true },
    mobileOverviewPriority: 'auto',
    pin: null,
    visible: true,
    ...overrides,
  }
}

const BASE_PROPS = {
  versionId: 3,
  revision: '3-2026-09-19T00:00:00+00:00',
  nodeTypes: NODE_TYPES,
  groups: GROUPS,
  onSaved: () => {},
  onDeleted: () => {},
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderForm(props: Partial<Parameters<typeof NodeForm>[0]> = {}) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <NodeForm {...BASE_PROPS} node={node()} {...props} />
    </QueryClientProvider>,
  )
}

describe('NodeForm (Plan B Task 11)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('shows the canonical record and never lets a key be edited', async () => {
    vi.mocked(fetch).mockImplementation((url: string | URL | Request) => {
      if (String(url).includes('/canonical-candidates')) {
        return Promise.resolve(
          jsonResponse([
            {
              translationKey: 'pars-sql',
              title: 'PARS-SQL / VTD-Edge',
              localeStatus: { en: true, fa: true },
              publishable: { en: true, fa: true },
            },
          ]),
        )
      }
      return Promise.resolve(jsonResponse({ detail: 'unused' }, 500))
    })
    renderForm()
    expect(screen.getByText('pars-sql')).toBeInTheDocument()
    expect(screen.queryByLabelText(/public key/i)).toBeNull()
    fireEvent.change(screen.getByLabelText('Canonical search'), {
      target: { value: 'PARS' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search records' }))
    await waitFor(() => {
      expect(screen.getByText('PARS-SQL / VTD-Edge')).toBeInTheDocument()
    })
  })

  it('blocks saving a pin with only one coordinate', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(node()))
    renderForm()
    await fireEvent.change(screen.getByLabelText(/pin x/i), {
      target: { value: '12' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(await screen.findByText(/both pin coordinates/i)).toBeInTheDocument()
    const posts = vi
      .mocked(fetch)
      .mock.calls.filter(([, init]) => init?.method === 'POST')
    expect(posts).toHaveLength(0)
  })

  it('warns when an override is blank and the canonical locale is missing', () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([]))
    renderForm({
      node: node({ localeStatus: { en: true, fa: false } }),
    })
    expect(screen.getByText(/no Persian canonical copy/i)).toBeInTheDocument()
  })

  it('lists active node types only', () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([]))
    renderForm()
    const select = screen.getByLabelText('Node type')
    const options = within(select).getAllByRole('option')
    expect(options.map((o) => o.getAttribute('value'))).toEqual(['', 'topic'])
  })

  it('creates a node with the revision header and assembled body', async () => {
    vi.mocked(fetch).mockImplementation((url: string | URL | Request) => {
      if (String(url).endsWith('/atlas/versions/3/nodes')) {
        return Promise.resolve(jsonResponse(node(), 201))
      }
      return Promise.resolve(jsonResponse({ detail: 'unused' }, 500))
    })
    const onSaved = vi.fn()
    renderForm({ node: null, onSaved })
    fireEvent.change(screen.getByLabelText('Node type'), {
      target: { value: 'topic' },
    })
    fireEvent.change(screen.getByLabelText('Importance'), {
      target: { value: '70' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create node' }))
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1)
    })
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(new Headers(init.headers).get('If-Match')).toBe(BASE_PROPS.revision)
    expect(JSON.parse(String(init.body))).toMatchObject({
      nodeTypeKey: 'topic',
      importance: 70,
    })
  })

  it('sends mobileOverviewPriority from the single radio group', async () => {
    vi.mocked(fetch).mockImplementation((url: string | URL | Request) => {
      if (String(url).endsWith('/atlas/versions/3/nodes')) {
        return Promise.resolve(jsonResponse(node(), 201))
      }
      return Promise.resolve(jsonResponse({ detail: 'unused' }, 500))
    })
    renderForm({ node: null })
    const radios = screen.getAllByRole('radio')
    expect(radios.map((r) => r.getAttribute('value')).sort()).toEqual([
      'auto',
      'featured',
      'hidden',
    ])
    fireEvent.change(screen.getByLabelText('Node type'), {
      target: { value: 'topic' },
    })
    fireEvent.click(screen.getByLabelText('Featured'))
    fireEvent.click(screen.getByRole('button', { name: 'Create node' }))
    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalled()
    })
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toMatchObject({
      mobileOverviewPriority: 'featured',
    })
  })

  it('posts group membership and aliases inside overrides', async () => {
    vi.mocked(fetch).mockImplementation((url: string | URL | Request) => {
      if (String(url).endsWith('/atlas/versions/3/nodes')) {
        return Promise.resolve(jsonResponse(node(), 201))
      }
      return Promise.resolve(jsonResponse({ detail: 'unused' }, 500))
    })
    renderForm({ node: null })
    fireEvent.change(screen.getByLabelText('Node type'), {
      target: { value: 'topic' },
    })
    fireEvent.click(screen.getByLabelText('Group one'))
    fireEvent.change(screen.getByLabelText('English aliases'), {
      target: { value: 'sql, dashboards' },
    })
    fireEvent.change(screen.getByLabelText('English label'), {
      target: { value: 'Custom title' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create node' }))
    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalled()
    })
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toMatchObject({
      groupKeys: ['g1'],
      overrides: {
        en: { label: 'Custom title', aliases: ['sql', 'dashboards'] },
      },
    })
  })

  it('updates the node by public key with PATCH', async () => {
    vi.mocked(fetch).mockImplementation((url: string | URL | Request) => {
      if (String(url).endsWith('/atlas/versions/3/nodes/topic-1')) {
        return Promise.resolve(jsonResponse(node()))
      }
      return Promise.resolve(jsonResponse({ detail: 'unused' }, 500))
    })
    const onSaved = vi.fn()
    renderForm({ onSaved })
    fireEvent.change(screen.getByLabelText('Importance'), {
      target: { value: '80' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1)
    })
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(String(url)).toBe('/api/v1/admin/atlas/versions/3/nodes/topic-1')
    expect(init.method).toBe('PATCH')
  })

  it('renders server field errors as alerts without saving', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        {
          code: 'VALIDATION',
          message: 'Node payload invalid.',
          fields: { importance: ['Must be between 0 and 100.'] },
          field_errors: { importance: ['Must be between 0 and 100.'] },
        },
        400,
      ),
    )
    const onSaved = vi.fn()
    renderForm({ node: null, onSaved })
    fireEvent.change(screen.getByLabelText('Node type'), {
      target: { value: 'topic' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create node' }))
    await waitFor(() => {
      expect(screen.getByText('Must be between 0 and 100.')).toBeInTheDocument()
    })
    expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(1)
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('disambiguates a stale revision conflict', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        { code: 'STALE_REVISION', message: 'Version revision is stale.' },
        409,
      ),
    )
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByText(/changed on the server/i)).toBeInTheDocument()
    })
  })

  it('deletes only after confirmation and reports the key', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))
    const onDeleted = vi.fn()
    renderForm({ onDeleted })
    fireEvent.click(screen.getByRole('button', { name: 'Delete node' }))
    expect(
      screen.getByRole('button', { name: 'Confirm delete' }),
    ).toBeInTheDocument()
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledWith('topic-1')
    })
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(String(url)).toBe('/api/v1/admin/atlas/versions/3/nodes/topic-1')
    expect(init.method).toBe('DELETE')
    expect(new Headers(init.headers).get('If-Match')).toBe(BASE_PROPS.revision)
  })

  it('has no delete action in create mode', () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([]))
    renderForm({ node: null })
    expect(
      screen.queryByRole('button', { name: 'Delete node' }),
    ).not.toBeInTheDocument()
  })
})
