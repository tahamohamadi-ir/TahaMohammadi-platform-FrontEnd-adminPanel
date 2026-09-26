import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  NodeTypeForm,
  RelationTypeForm,
} from '@/components/atlas/TaxonomyForms'
import type { AtlasNodeTypeRow, AtlasRelationTypeRow } from '@/lib/api/atlas'
import { createTestQueryClient } from '@/lib/query/client'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function nodeRow(overrides: Partial<AtlasNodeTypeRow> = {}): AtlasNodeTypeRow {
  return {
    key: 'project',
    label_en: 'Project',
    label_fa: 'پروژه',
    active: true,
    sort_order: 0,
    defaultImportance: 50,
    canonicalSource: 'project',
    ...overrides,
  }
}

function relationRow(
  overrides: Partial<AtlasRelationTypeRow> = {},
): AtlasRelationTypeRow {
  return {
    key: 'uses',
    label_en: 'Uses',
    label_fa: 'استفاده می‌کند',
    active: true,
    sort_order: 0,
    canonicalSource: 'none',
    defaultImportance: 50,
    directedDefault: true,
    overridableDirection: true,
    hierarchyRole: false,
    allowedSourceTypes: ['project'],
    allowedTargetTypes: ['method'],
    ...overrides,
  }
}

const NODE_TYPES: AtlasNodeTypeRow[] = [
  nodeRow(),
  nodeRow({
    key: 'method',
    label_en: 'Method',
    label_fa: 'روش',
    canonicalSource: 'method',
  }),
]

function renderNodeForm(
  props: Partial<Parameters<typeof NodeTypeForm>[0]> = {},
) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <NodeTypeForm row={null} onSaved={() => {}} {...props} />
    </QueryClientProvider>,
  )
}

function renderRelationForm(
  props: Partial<Parameters<typeof RelationTypeForm>[0]> = {},
) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <RelationTypeForm row={null} onSaved={() => {}} {...props} />
    </QueryClientProvider>,
  )
}

describe('NodeTypeForm (Plan B Task 13)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('disables the key input with an explanation for an in-use type', () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(nodeRow()))
    renderNodeForm({ row: nodeRow(), inUse: true })
    const key = screen.getByLabelText('Key') as HTMLInputElement
    expect(key.disabled).toBe(true)
    expect(screen.getByText(/key is immutable.*in use/i)).toBeInTheDocument()
  })

  it('creates a node type with key, labels, active and sort order', async () => {
    vi.mocked(fetch).mockImplementation((url: string | URL | Request) => {
      if (String(url).endsWith('/atlas/node-types')) {
        return Promise.resolve(jsonResponse(nodeRow(), 201))
      }
      return Promise.resolve(jsonResponse({ detail: 'unused' }, 500))
    })
    const onSaved = vi.fn()
    renderNodeForm({ onSaved })
    fireEvent.change(screen.getByLabelText('Key'), {
      target: { value: 'project' },
    })
    fireEvent.change(screen.getByLabelText('English label'), {
      target: { value: 'Project' },
    })
    fireEvent.change(screen.getByLabelText('Persian label'), {
      target: { value: 'پروژه' },
    })
    fireEvent.change(screen.getByLabelText('Sort order'), {
      target: { value: '2' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create node type' }))
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1)
    })
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(String(url)).toBe('/api/v1/admin/atlas/node-types')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toMatchObject({
      key: 'project',
      label_en: 'Project',
      label_fa: 'پروژه',
      active: true,
      sort_order: 2,
    })
  })

  it('edits allowed fields and never sends the key', async () => {
    vi.mocked(fetch).mockImplementation((url: string | URL | Request) => {
      if (String(url).endsWith('/atlas/node-types/project')) {
        return Promise.resolve(jsonResponse(nodeRow({ sort_order: 3 })))
      }
      return Promise.resolve(jsonResponse({ detail: 'unused' }, 500))
    })
    const onSaved = vi.fn()
    renderNodeForm({ row: nodeRow(), onSaved })
    const key = screen.getByLabelText('Key') as HTMLInputElement
    expect(key.disabled).toBe(true)
    expect(screen.getByText('project')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('English label'), {
      target: { value: 'Projects' },
    })
    fireEvent.change(screen.getByLabelText('Sort order'), {
      target: { value: '3' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save node type' }))
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1)
    })
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(String(url)).toBe('/api/v1/admin/atlas/node-types/project')
    expect(init.method).toBe('PATCH')
    const body = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(body).toMatchObject({ label_en: 'Projects', sort_order: 3 })
    expect(body).not.toHaveProperty('key')
  })

  it('reactivates a retired type', async () => {
    vi.mocked(fetch).mockImplementation((url: string | URL | Request) => {
      if (String(url).endsWith('/atlas/node-types/project')) {
        return Promise.resolve(jsonResponse(nodeRow({ active: true })))
      }
      return Promise.resolve(jsonResponse({ detail: 'unused' }, 500))
    })
    const onSaved = vi.fn()
    renderNodeForm({ row: nodeRow({ active: false }), onSaved })
    expect(screen.getByText('Retired')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Active'))
    fireEvent.click(screen.getByRole('button', { name: 'Save node type' }))
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1)
    })
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toMatchObject({ active: true })
  })

  it('renders validation errors without saving', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        {
          code: 'VALIDATION',
          message: 'Duplicate taxonomy key.',
          fields: { key: ["'project' already exists."] },
        },
        400,
      ),
    )
    const onSaved = vi.fn()
    renderNodeForm({ onSaved })
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
      expect(screen.getByText(/already exists/)).toBeInTheDocument()
    })
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('surfaces the server conflict when deleting an in-use type', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        {
          code: 'TAXONOMY_IN_USE',
          message: 'A node type in use cannot be deleted.',
          fields: { key: ["'project' has nodes referencing it."] },
        },
        409,
      ),
    )
    const onDeleted = vi.fn()
    renderNodeForm({ row: nodeRow(), onSaved: () => {}, onDeleted })
    fireEvent.click(screen.getByRole('button', { name: 'Delete node type' }))
    expect(
      screen.getByRole('button', { name: 'Confirm delete' }),
    ).toBeInTheDocument()
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    await waitFor(() => {
      expect(screen.getByText(/TAXONOMY_IN_USE/)).toBeInTheDocument()
    })
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it('shows the served canonical source and default importance read-only', () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(nodeRow()))
    renderNodeForm({ row: nodeRow() })
    expect(screen.getByText('project')).toBeInTheDocument()
    expect(screen.queryByLabelText(/canonical source/i)).toBeNull()
    expect(screen.queryByLabelText(/default importance/i)).toBeNull()
  })
})

describe('RelationTypeForm (Plan B Task 13)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('disables the key input with an explanation for an in-use type', () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(relationRow()))
    renderRelationForm({ row: relationRow(), inUse: true })
    const key = screen.getByLabelText('Key') as HTMLInputElement
    expect(key.disabled).toBe(true)
    expect(screen.getByText(/key is immutable.*in use/i)).toBeInTheDocument()
  })

  it('reflects the saved allowed source and target values', () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(relationRow()))
    renderRelationForm({ row: relationRow(), nodeTypes: NODE_TYPES })
    expect(screen.getByText(/project/)).toBeInTheDocument()
    expect(screen.getByText(/method/)).toBeInTheDocument()
    expect(screen.queryByLabelText('project')).toBeNull()
  })

  it('creates with hierarchy metadata and allowed types', async () => {
    vi.mocked(fetch).mockImplementation((url: string | URL | Request) => {
      if (String(url).endsWith('/atlas/relation-types')) {
        return Promise.resolve(jsonResponse(relationRow(), 201))
      }
      return Promise.resolve(jsonResponse({ detail: 'unused' }, 500))
    })
    const onSaved = vi.fn()
    renderRelationForm({ row: null, nodeTypes: NODE_TYPES, onSaved })
    fireEvent.change(screen.getByLabelText('Key'), {
      target: { value: 'uses' },
    })
    fireEvent.change(screen.getByLabelText('English label'), {
      target: { value: 'Uses' },
    })
    fireEvent.change(screen.getByLabelText('Persian label'), {
      target: { value: 'استفاده می‌کند' },
    })
    // Source and target fieldsets list the same type keys; the source
    // fieldset renders first, so index 0 is the source checkbox.
    fireEvent.click(screen.getAllByLabelText('project')[0])
    fireEvent.click(screen.getAllByLabelText('method')[1])
    fireEvent.click(
      screen.getByRole('button', { name: 'Create relation type' }),
    )
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1)
    })
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(String(url)).toBe('/api/v1/admin/atlas/relation-types')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toMatchObject({
      key: 'uses',
      label_en: 'Uses',
      label_fa: 'استفاده می‌کند',
      directedDefault: true,
      overridableDirection: true,
      allowedSourceTypes: ['project'],
      allowedTargetTypes: ['method'],
    })
  })

  it('shows the hierarchy role read-only with no editable control', () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(relationRow()))
    renderRelationForm({
      row: relationRow({ hierarchyRole: true }),
      nodeTypes: NODE_TYPES,
    })
    expect(screen.getByText(/hierarchy relation: yes/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/hierarchy/i)).toBeNull()
  })

  it('states the fixed-direction rule when direction is not overridable', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(relationRow()))
    renderRelationForm({ row: null, nodeTypes: NODE_TYPES, onSaved: () => {} })
    fireEvent.click(screen.getByLabelText('Overridable direction'))
    await waitFor(() => {
      expect(
        screen.getByText(/always use the default direction/i),
      ).toBeInTheDocument()
    })
  })

  it('deactivates a relation type in use only through the retire path', async () => {
    vi.mocked(fetch).mockImplementation((url: string | URL | Request) => {
      if (String(url).endsWith('/atlas/relation-types/uses')) {
        return Promise.resolve(jsonResponse(relationRow({ active: false })))
      }
      return Promise.resolve(jsonResponse({ detail: 'unused' }, 500))
    })
    const onSaved = vi.fn()
    renderRelationForm({
      row: relationRow(),
      nodeTypes: NODE_TYPES,
      onSaved,
    })
    fireEvent.click(screen.getByLabelText('Active'))
    fireEvent.click(screen.getByRole('button', { name: 'Save relation type' }))
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1)
    })
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(String(url)).toBe('/api/v1/admin/atlas/relation-types/uses')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(String(init.body))).toMatchObject({ active: false })
  })

  it('blocks retire of an in-use relation type with the server conflict', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        {
          code: 'TAXONOMY_IN_USE',
          message: 'A relation type in use cannot be retired.',
          fields: { active: ["'uses' still has relations using it."] },
        },
        409,
      ),
    )
    const onSaved = vi.fn()
    renderRelationForm({
      row: relationRow(),
      nodeTypes: NODE_TYPES,
      onSaved,
    })
    fireEvent.click(screen.getByLabelText('Active'))
    fireEvent.click(screen.getByRole('button', { name: 'Save relation type' }))
    await waitFor(() => {
      expect(screen.getByText(/TAXONOMY_IN_USE/)).toBeInTheDocument()
    })
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('surfaces the server conflict when deleting an in-use relation type', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        {
          code: 'TAXONOMY_IN_USE',
          message: 'A taxonomy row in use cannot be deleted.',
          fields: { key: ["'uses' has rows referencing it."] },
        },
        409,
      ),
    )
    const onDeleted = vi.fn()
    renderRelationForm({
      row: relationRow(),
      nodeTypes: NODE_TYPES,
      onSaved: () => {},
      onDeleted,
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete relation type' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    await waitFor(() => {
      expect(screen.getByText(/TAXONOMY_IN_USE/)).toBeInTheDocument()
    })
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it('renders validation errors without saving', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        {
          code: 'VALIDATION',
          message: 'Unknown allowedSourceTypes entry.',
          fields: { allowedSourceTypes: ["no node type 'ghost'."] },
        },
        400,
      ),
    )
    const onSaved = vi.fn()
    renderRelationForm({ row: null, nodeTypes: NODE_TYPES, onSaved })
    fireEvent.change(screen.getByLabelText('Key'), {
      target: { value: 'uses' },
    })
    fireEvent.change(screen.getByLabelText('English label'), {
      target: { value: 'Uses' },
    })
    fireEvent.change(screen.getByLabelText('Persian label'), {
      target: { value: 'استفاده می‌کند' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Create relation type' }),
    )
    await waitFor(() => {
      expect(screen.getByText(/no node type/)).toBeInTheDocument()
    })
    expect(onSaved).not.toHaveBeenCalled()
  })
})
