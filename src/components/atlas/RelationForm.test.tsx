import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RelationForm } from '@/components/atlas/RelationForm'
import type {
  AtlasNodeRow,
  AtlasNodeTypeRow,
  AtlasRelationRow,
  AtlasRelationTypeRow,
} from '@/lib/api/atlas'
import { createTestQueryClient } from '@/lib/query/client'

function nodeType(key: string): AtlasNodeTypeRow {
  return {
    key,
    label_en: key,
    label_fa: key,
    active: true,
    sort_order: 0,
    defaultImportance: 50,
    canonicalSource: 'none',
  }
}

function node(
  publicKey: string,
  nodeTypeKey: string,
  overrides: Partial<AtlasNodeRow> = {},
): AtlasNodeRow {
  return {
    publicKey,
    nodeTypeKey,
    canonicalSource: 'none',
    canonicalTranslationKey: null,
    groupKeys: [],
    importance: 50,
    localeStatus: { en: true, fa: true },
    mobileOverviewPriority: 'auto',
    pin: null,
    visible: true,
    ...overrides,
  }
}

const NODES = [
  node('project-x', 'project'),
  node('method-y', 'method'),
  node('topic-z', 'topic'),
]

const TYPES: AtlasRelationTypeRow[] = [
  {
    key: 'uses',
    label_en: 'uses',
    label_fa: 'استفاده',
    active: true,
    sort_order: 0,
    canonicalSource: 'none',
    defaultImportance: 50,
    directedDefault: true,
    overridableDirection: false,
    hierarchyRole: false,
    allowedSourceTypes: ['project'],
    allowedTargetTypes: ['method'],
  },
  {
    key: 'contains',
    label_en: 'contains',
    label_fa: 'شامل',
    active: true,
    sort_order: 1,
    canonicalSource: 'none',
    defaultImportance: 50,
    directedDefault: true,
    overridableDirection: true,
    hierarchyRole: true,
    allowedSourceTypes: [],
    allowedTargetTypes: [],
  },
]

const RELATION: AtlasRelationRow = {
  key: 'project-x~uses~method-y',
  sourceKey: 'project-x',
  relationTypeKey: 'uses',
  targetKey: 'method-y',
  directed: true,
  weight: 2,
  visible: true,
}

const BASE_PROPS = {
  versionId: 3,
  revision: '3-2026-09-19T00:00:00+00:00',
  nodes: NODES,
  nodeTypes: [nodeType('project'), nodeType('method'), nodeType('topic')],
  relationTypes: TYPES,
  onSaved: () => {},
  onDeleted: () => {},
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderForm(props: Partial<Parameters<typeof RelationForm>[0]> = {}) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <RelationForm {...BASE_PROPS} relation={null} {...props} />
    </QueryClientProvider>,
  )
}

describe('RelationForm (Plan B Task 12)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('hides Directed for a non-overridable type', () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([]))
    renderForm()
    fireEvent.change(screen.getByLabelText('Relation Type'), {
      target: { value: 'uses' },
    })
    expect(screen.queryByLabelText('Directed')).not.toBeInTheDocument()
  })

  it('shows Directed for an overridable type', () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([]))
    renderForm()
    fireEvent.change(screen.getByLabelText('Relation Type'), {
      target: { value: 'contains' },
    })
    expect(screen.getByLabelText('Directed')).toBeInTheDocument()
  })

  it('filters the target picker to allowed types', () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([]))
    renderForm()
    fireEvent.change(screen.getByLabelText('Source'), {
      target: { value: 'project-x' },
    })
    fireEvent.change(screen.getByLabelText('Relation Type'), {
      target: { value: 'uses' },
    })
    const target = screen.getByLabelText('Target')
    const options = within(target)
      .getAllByRole('option')
      .map((o) => o.getAttribute('value'))
    expect(options).toContain('method-y')
    expect(options).not.toContain('topic-z')
    expect(options).not.toContain('project-x')
  })

  it('renders a server RELATION_TYPE_NOT_ALLOWED issue inline on the target field', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        {
          code: 'VALIDATION_BLOCKED',
          message: 'Relation type is not allowed for this endpoint pair.',
          issues: [
            {
              code: 'RELATION_TYPE_NOT_ALLOWED',
              relationKey: 'project-x~uses~topic-z',
              messageToken: 'atlas.relationTypeNotAllowed',
            },
          ],
        },
        409,
      ),
    )
    renderForm()
    fireEvent.change(screen.getByLabelText('Source'), {
      target: { value: 'project-x' },
    })
    fireEvent.change(screen.getByLabelText('Relation Type'), {
      target: { value: 'contains' },
    })
    fireEvent.change(screen.getByLabelText('Target'), {
      target: { value: 'topic-z' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create relation' }))
    await waitFor(() => {
      expect(screen.getByText(/not allowed for this pair/i)).toBeInTheDocument()
    })
  })

  it('creates a relation with the revision header', async () => {
    vi.mocked(fetch).mockImplementation((url: string | URL | Request) => {
      if (String(url).endsWith('/atlas/versions/3/relations')) {
        return Promise.resolve(jsonResponse(RELATION, 201))
      }
      return Promise.resolve(jsonResponse({ detail: 'unused' }, 500))
    })
    const onSaved = vi.fn()
    renderForm({ onSaved })
    fireEvent.change(screen.getByLabelText('Source'), {
      target: { value: 'project-x' },
    })
    fireEvent.change(screen.getByLabelText('Relation Type'), {
      target: { value: 'uses' },
    })
    fireEvent.change(screen.getByLabelText('Target'), {
      target: { value: 'method-y' },
    })
    fireEvent.change(screen.getByLabelText('Weight'), {
      target: { value: '3' },
    })
    fireEvent.change(screen.getByLabelText('English explanation'), {
      target: { value: 'Uses it.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create relation' }))
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1)
    })
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(String(url)).toBe('/api/v1/admin/atlas/versions/3/relations')
    expect(init.method).toBe('POST')
    expect(new Headers(init.headers).get('If-Match')).toBe(BASE_PROPS.revision)
    expect(JSON.parse(String(init.body))).toMatchObject({
      sourceKey: 'project-x',
      relationTypeKey: 'uses',
      targetKey: 'method-y',
      weight: 3,
      explanation: { en: 'Uses it.' },
    })
  })

  it('displays the relation key read-only and updates by key', async () => {
    vi.mocked(fetch).mockImplementation((url: string | URL | Request) => {
      if (
        String(url).endsWith(
          '/atlas/versions/3/relations/project-x~uses~method-y',
        )
      ) {
        return Promise.resolve(jsonResponse(RELATION))
      }
      return Promise.resolve(jsonResponse({ detail: 'unused' }, 500))
    })
    const onSaved = vi.fn()
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <RelationForm {...BASE_PROPS} relation={RELATION} onSaved={onSaved} />
      </QueryClientProvider>,
    )
    expect(screen.getByText('project-x~uses~method-y')).toBeInTheDocument()
    expect(screen.queryByLabelText(/relation key/i)).toBeNull()
    fireEvent.change(screen.getByLabelText('Weight'), {
      target: { value: '5' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save relation' }))
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1)
    })
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(String(url)).toBe(
      '/api/v1/admin/atlas/versions/3/relations/project-x~uses~method-y',
    )
    expect(init.method).toBe('PATCH')
    expect(new Headers(init.headers).get('If-Match')).toBe(BASE_PROPS.revision)
  })

  it('deletes only after confirmation', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))
    const onDeleted = vi.fn()
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <RelationForm
          {...BASE_PROPS}
          relation={RELATION}
          onSaved={() => {}}
          onDeleted={onDeleted}
        />
      </QueryClientProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete relation' }))
    expect(
      screen.getByRole('button', { name: 'Confirm delete' }),
    ).toBeInTheDocument()
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledWith('project-x~uses~method-y')
    })
  })
})
