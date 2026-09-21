import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { RelationTable } from '@/components/atlas/RelationTable'
import type {
  AtlasNodeRow,
  AtlasNodeTypeRow,
  AtlasRelationRow,
  AtlasRelationTypeRow,
} from '@/lib/api/atlas'

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

function node(publicKey: string, nodeTypeKey: string): AtlasNodeRow {
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
  }
}

function relType(key: string, hierarchyRole: boolean): AtlasRelationTypeRow {
  return {
    key,
    label_en: key,
    label_fa: key,
    active: true,
    sort_order: 0,
    canonicalSource: 'none',
    defaultImportance: 50,
    directedDefault: true,
    overridableDirection: true,
    hierarchyRole,
    allowedSourceTypes: [],
    allowedTargetTypes: [],
  }
}

const NODES = [
  node('project-x', 'project'),
  node('method-y', 'method'),
  node('topic-z', 'topic'),
]

const RELATIONS: AtlasRelationRow[] = [
  {
    key: 'project-x~uses~method-y',
    sourceKey: 'project-x',
    relationTypeKey: 'uses',
    targetKey: 'method-y',
    directed: true,
    weight: 2,
    visible: true,
  },
  {
    key: 'project-x~contains~topic-z',
    sourceKey: 'project-x',
    relationTypeKey: 'contains',
    targetKey: 'topic-z',
    directed: true,
    weight: 1,
    visible: false,
  },
]

const BASE_PROPS = {
  relations: RELATIONS,
  nodes: NODES,
  nodeTypes: [nodeType('project'), nodeType('method'), nodeType('topic')],
  relationTypes: [relType('uses', false), relType('contains', true)],
  onEdit: () => {},
  onDelete: () => {},
  onInspect: () => {},
}

describe('RelationTable (Plan B Task 12)', () => {
  it('renders one row per relation with its key', () => {
    render(<RelationTable {...BASE_PROPS} />)
    expect(screen.getByText('project-x~uses~method-y')).toBeInTheDocument()
    expect(screen.getByText('project-x~contains~topic-z')).toBeInTheDocument()
  })

  it('filters to hierarchy relations only when asked', () => {
    render(<RelationTable {...BASE_PROPS} />)
    fireEvent.click(screen.getByLabelText('Hierarchy only'))
    expect(
      screen.queryByText('project-x~uses~method-y'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('project-x~contains~topic-z')).toBeInTheDocument()
  })

  it('filters by relation type, endpoint types and visibility', () => {
    render(<RelationTable {...BASE_PROPS} />)
    fireEvent.change(screen.getByLabelText('Relation type'), {
      target: { value: 'uses' },
    })
    expect(screen.getByText('project-x~uses~method-y')).toBeInTheDocument()
    expect(
      screen.queryByText('project-x~contains~topic-z'),
    ).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Relation type'), {
      target: { value: 'all' },
    })
    fireEvent.click(screen.getByLabelText('Hidden only'))
    expect(
      screen.queryByText('project-x~uses~method-y'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('project-x~contains~topic-z')).toBeInTheDocument()
  })

  it('asks for confirmation before deleting', () => {
    const onDelete = vi.fn()
    render(<RelationTable {...BASE_PROPS} onDelete={onDelete} />)
    const row = screen
      .getByText('project-x~uses~method-y')
      .closest('tr') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: 'Delete' }))
    expect(
      within(row).getByRole('button', { name: 'Confirm delete' }),
    ).toBeInTheDocument()
    expect(onDelete).not.toHaveBeenCalled()
    fireEvent.click(within(row).getByRole('button', { name: 'Confirm delete' }))
    expect(onDelete).toHaveBeenCalledWith('project-x~uses~method-y')
  })

  it('edits and inspects through callbacks', () => {
    const onEdit = vi.fn()
    const onInspect = vi.fn()
    render(
      <RelationTable {...BASE_PROPS} onEdit={onEdit} onInspect={onInspect} />,
    )
    const row = screen
      .getByText('project-x~uses~method-y')
      .closest('tr') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledWith('project-x~uses~method-y')
    fireEvent.click(within(row).getByRole('button', { name: 'Inspect' }))
    expect(onInspect).toHaveBeenCalledWith('project-x~uses~method-y')
  })
})
