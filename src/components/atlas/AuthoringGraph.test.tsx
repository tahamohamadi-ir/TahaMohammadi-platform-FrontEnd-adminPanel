import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthoringGraph } from '@/components/atlas/AuthoringGraph'
import { computeNodePositions } from '@/components/atlas/graph-layout'
import type {
  AtlasGroupRow,
  AtlasNodeRow,
  AtlasRelationRow,
  AtlasRelationTypeRow,
} from '@/lib/api/atlas'

function node(
  publicKey: string,
  nodeTypeKey: string,
  pin: { x: number; y: number } | null,
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
    pin,
    visible: true,
  }
}

const NODES = [
  node('method-11223344', 'method', { x: 5, y: 5 }),
  node('project-2b3c4d5e', 'project', null),
  node('research-area-1a2b3c4d', 'research-area', null),
]

const RELATIONS: AtlasRelationRow[] = [
  {
    key: 'research-area-1a2b3c4d~contains~project-2b3c4d5e',
    sourceKey: 'research-area-1a2b3c4d',
    relationTypeKey: 'contains',
    targetKey: 'project-2b3c4d5e',
    directed: true,
    visible: true,
    weight: 0,
  },
  {
    key: 'project-2b3c4d5e~uses~method-11223344',
    sourceKey: 'project-2b3c4d5e',
    relationTypeKey: 'uses',
    targetKey: 'method-11223344',
    directed: true,
    visible: true,
    weight: 1,
  },
]

const RELATION_TYPES: AtlasRelationTypeRow[] = [
  {
    key: 'contains',
    label_en: 'contains',
    label_fa: 'شامل',
    active: true,
    sort_order: 0,
    canonicalSource: 'none',
    defaultImportance: 50,
    directedDefault: true,
    overridableDirection: false,
    hierarchyRole: true,
    allowedSourceTypes: [],
    allowedTargetTypes: [],
  },
  {
    key: 'uses',
    label_en: 'uses',
    label_fa: 'استفاده',
    active: true,
    sort_order: 1,
    canonicalSource: 'none',
    defaultImportance: 50,
    directedDefault: true,
    overridableDirection: true,
    hierarchyRole: false,
    allowedSourceTypes: [],
    allowedTargetTypes: [],
  },
]

const GROUPS: AtlasGroupRow[] = [
  { key: 'group-1a2b3c4d', label: 'Core', memberKeys: ['project-2b3c4d5e'] },
]

const GRAPH = { nodes: NODES, relations: RELATIONS, groups: GROUPS }

function pointer(target: Element, type: string, x: number, y: number) {
  // jsdom's PointerEvent does not reliably carry clientX/clientY through
  // fireEvent's init dict, so dispatch a bubbling event with the
  // coordinates assigned — React reads them off the native event.
  const event = new Event(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
  })
  const coords = event as unknown as Record<string, number>
  coords['clientX'] = x
  coords['clientY'] = y
  fireEvent(target, event)
}

function renderGraph(
  props: Partial<Parameters<typeof AuthoringGraph>[0]> = {},
) {
  return render(
    <AuthoringGraph
      graph={GRAPH}
      relationTypes={RELATION_TYPES}
      selectedKey={null}
      onSelect={() => {}}
      onPin={() => {}}
      {...props}
    />,
  )
}

function centre(key: string): { x: number; y: number } {
  const symbol = screen.getByRole('graphics-symbol', { name: key })
  return {
    x: Number(symbol.getAttribute('data-cx')),
    y: Number(symbol.getAttribute('data-cy')),
  }
}

function transform(): { scale: number; ox: number; oy: number } {
  const document_ = screen.getByRole('graphics-document')
  return {
    scale: Number(document_.getAttribute('data-scale')),
    ox: Number(document_.getAttribute('data-ox')),
    oy: Number(document_.getAttribute('data-oy')),
  }
}

describe('AuthoringGraph (Plan B Task 14)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders every visible node at its stored coordinate transform', () => {
    renderGraph()
    expect(screen.getAllByRole('graphics-symbol')).toHaveLength(NODES.length)
    const world = computeNodePositions(NODES)
    const { scale, ox, oy } = transform()
    for (const row of NODES) {
      const expected = world[row.publicKey]
      const actual = centre(row.publicKey)
      // One affine transform for every node: screen = world * scale + offset.
      expect(actual.x).toBeCloseTo(expected.x * scale + ox, 5)
      expect(actual.y).toBeCloseTo(expected.y * scale + oy, 5)
    }
  })

  it('keeps coordinates deterministic across renders', () => {
    const first = renderGraph()
    const before = NODES.map((row) => centre(row.publicKey))
    first.unmount()
    renderGraph()
    const after = NODES.map((row) => centre(row.publicKey))
    expect(after).toEqual(before)
  })

  it('renders relations and groups from the draft', () => {
    const { container } = renderGraph()
    expect(container.querySelectorAll('[data-relation-key]').length).toBe(
      RELATIONS.length,
    )
    expect(screen.getByText('Core')).toBeInTheDocument()
  })

  it('writes a pin on drag-end and never on drag-move', () => {
    const onPin = vi.fn()
    renderGraph({ onPin })
    const target = screen.getByRole('graphics-symbol', {
      name: 'project-2b3c4d5e',
    })
    pointer(target, 'pointerdown', 100, 100)
    pointer(target, 'pointermove', 140, 90)
    expect(onPin).not.toHaveBeenCalled()
    pointer(target, 'pointerup', 140, 90)
    expect(onPin).toHaveBeenCalledTimes(1)
    const world = computeNodePositions(NODES)
    const { scale } = transform()
    const [key, pin] = onPin.mock.calls[0] as [string, { x: number; y: number }]
    expect(key).toBe('project-2b3c4d5e')
    expect(pin.x).toBeCloseTo(world['project-2b3c4d5e'].x + 40 / scale, 5)
    expect(pin.y).toBeCloseTo(world['project-2b3c4d5e'].y - 10 / scale, 5)
  })

  it('offers no drag-to-connect surface', () => {
    const { container } = renderGraph()
    expect(container.querySelectorAll('[data-connect]').length).toBe(0)
  })

  it('selects a node on click without mutating the graph', () => {
    const onSelect = vi.fn()
    const onPin = vi.fn()
    renderGraph({ onSelect, onPin })
    fireEvent.click(
      screen.getByRole('graphics-symbol', { name: 'project-2b3c4d5e' }),
    )
    expect(onSelect).toHaveBeenCalledWith('project-2b3c4d5e')
    expect(onPin).not.toHaveBeenCalled()
  })

  it('clears the selection on background click', () => {
    const onSelect = vi.fn()
    renderGraph({ onSelect, selectedKey: 'project-2b3c4d5e' })
    fireEvent.click(screen.getByRole('graphics-document'))
    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('highlights incident relations for the selected node', () => {
    const { container } = renderGraph({ selectedKey: 'project-2b3c4d5e' })
    // Both fixture relations touch project-2b3c4d5e.
    expect(container.querySelectorAll('[data-incident="true"]').length).toBe(2)
    expect(container.querySelectorAll('[data-incident="false"]').length).toBe(0)
  })

  it('selects a relation on click without mutating the graph', () => {
    const onSelectRelation = vi.fn()
    const onPin = vi.fn()
    const { container } = renderGraph({ onSelectRelation, onPin })
    const line = container.querySelector(
      '[data-relation-key="project-2b3c4d5e~uses~method-11223344"]',
    ) as Element
    fireEvent.click(line)
    expect(onSelectRelation).toHaveBeenCalledWith(
      'project-2b3c4d5e~uses~method-11223344',
    )
    expect(onPin).not.toHaveBeenCalled()
  })

  it('marks hierarchy-role relations with a distinct stroke', () => {
    const { container } = renderGraph({ selectedKey: null })
    const hierarchy = container.querySelector(
      '[data-relation-key="research-area-1a2b3c4d~contains~project-2b3c4d5e"]',
    ) as Element
    const plain = container.querySelector(
      '[data-relation-key="project-2b3c4d5e~uses~method-11223344"]',
    ) as Element
    expect(hierarchy.getAttribute('data-hierarchy')).toBe('true')
    expect(plain.getAttribute('data-hierarchy')).toBe('false')
    expect(hierarchy.getAttribute('stroke')).not.toBe(
      plain.getAttribute('stroke'),
    )
  })

  it('moves the selection with arrow keys between neighbours', () => {
    const onSelect = vi.fn()
    renderGraph({ onSelect, selectedKey: 'method-11223344' })
    const focused = screen.getByRole('graphics-symbol', {
      name: 'method-11223344',
    })
    fireEvent.keyDown(focused, { key: 'ArrowRight' })
    expect(onSelect).toHaveBeenCalledWith('project-2b3c4d5e')
  })

  it('pins the focused node with the keyboard', () => {
    const onPin = vi.fn()
    renderGraph({ onPin, selectedKey: 'project-2b3c4d5e' })
    const focused = screen.getByRole('graphics-symbol', {
      name: 'project-2b3c4d5e',
    })
    fireEvent.keyDown(focused, { key: 'p' })
    expect(onPin).toHaveBeenCalledTimes(1)
    const world = computeNodePositions(NODES)
    expect(onPin).toHaveBeenCalledWith(
      'project-2b3c4d5e',
      expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
      }),
    )
    expect(onPin.mock.calls[0][1]).toEqual(world['project-2b3c4d5e'])
  })

  it('shows a visible focus ring on the focused node', () => {
    renderGraph()
    const target = screen.getByRole('graphics-symbol', {
      name: 'project-2b3c4d5e',
    })
    fireEvent.focus(target)
    expect(target.getAttribute('data-focused')).toBe('true')
  })

  it('keeps semantic topology identical under RTL', () => {
    const ltr = renderGraph()
    const ltrCentres = NODES.map((row) => centre(row.publicKey))
    ltr.unmount()
    render(
      <div dir="rtl">
        <AuthoringGraph
          graph={GRAPH}
          relationTypes={RELATION_TYPES}
          selectedKey={null}
          onSelect={() => {}}
          onPin={() => {}}
        />
      </div>,
    )
    const rtlCentres = NODES.map((row) => centre(row.publicKey))
    expect(rtlCentres).toEqual(ltrCentres)
  })

  it('restores the stored pin when the pin write does not land', () => {
    const onPin = vi.fn()
    const view = renderGraph({ onPin })
    const target = screen.getByRole('graphics-symbol', {
      name: 'project-2b3c4d5e',
    })
    const before = centre('project-2b3c4d5e')
    pointer(target, 'pointerdown', 100, 100)
    pointer(target, 'pointermove', 200, 200)
    pointer(target, 'pointerup', 200, 200)
    expect(onPin).toHaveBeenCalledTimes(1)
    // The host keeps the old props after a failed write: a rerender with
    // the unchanged graph puts the node back where the server has it.
    view.rerender(
      <AuthoringGraph
        graph={GRAPH}
        relationTypes={RELATION_TYPES}
        selectedKey={null}
        onSelect={() => {}}
        onPin={onPin}
      />,
    )
    expect(centre('project-2b3c4d5e')).toEqual(before)
  })
})
