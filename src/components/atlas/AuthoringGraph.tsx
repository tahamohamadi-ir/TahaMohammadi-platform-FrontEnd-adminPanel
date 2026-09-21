import { useMemo, useState } from 'react'

import {
  GRAPH_VIEW,
  computeNodePositions,
  computeTransform,
  type WorldPoint,
} from '@/components/atlas/graph-layout'
import type {
  AtlasGroupRow,
  AtlasNodeRow,
  AtlasRelationRow,
  AtlasRelationTypeRow,
} from '@/lib/api/atlas'

export interface AuthoringGraphData {
  nodes: AtlasNodeRow[]
  relations: AtlasRelationRow[]
  groups: AtlasGroupRow[]
}

export interface AuthoringGraphProps {
  graph: AuthoringGraphData
  relationTypes?: AtlasRelationTypeRow[]
  selectedKey: string | null
  selectedRelationKey?: string | null
  onSelect: (key: string | null) => void
  onSelectRelation?: (key: string | null) => void
  onPin: (key: string, pin: WorldPoint) => void
}

interface DragPreview {
  key: string
  dx: number
  dy: number
}

function isHierarchy(
  relationTypes: AtlasRelationTypeRow[],
  relationTypeKey: string,
): boolean {
  return (
    relationTypes.find((type) => type.key === relationTypeKey)
      ?.hierarchyRole === true
  )
}

/** Deterministic 2D authoring graph (Plan B Task 14).
 *
 * An SVG authoring plane over the draft: visible nodes render at their
 * stored coordinates through one deterministic affine transform, a
 * selected node highlights its incident relations, hierarchy-role
 * relations carry a distinct stroke, and dragging a node writes a pin
 * (`pin:{x,y}`) on drag-end only. There is deliberately no
 * drag-to-connect surface — relation creation stays in the structured
 * form. Pin storage stays server-side (PATCH node); this component is
 * controlled, so a failed write rerenders the stored position.
 * Coordinates are physical and never mirrored: RTL layouts render the
 * identical topology.
 */
export function AuthoringGraph({
  graph,
  relationTypes = [],
  selectedKey,
  selectedRelationKey = null,
  onSelect,
  onSelectRelation,
  onPin,
}: AuthoringGraphProps) {
  const [focusedKey, setFocusedKey] = useState<string | null>(null)
  const [drag, setDrag] = useState<{
    key: string
    startX: number
    startY: number
    orig: WorldPoint
  } | null>(null)
  const [preview, setPreview] = useState<DragPreview | null>(null)

  const visibleNodes = useMemo(
    () => graph.nodes.filter((node) => node.visible !== false),
    [graph.nodes],
  )
  const positions = useMemo(
    () => computeNodePositions(visibleNodes),
    [visibleNodes],
  )
  const transform = useMemo(() => computeTransform(positions), [positions])
  const orderedKeys = useMemo(
    () =>
      [...visibleNodes]
        .sort((a, b) =>
          a.publicKey < b.publicKey ? -1 : a.publicKey > b.publicKey ? 1 : 0,
        )
        .map((node) => node.publicKey),
    [visibleNodes],
  )

  function toScreen(point: WorldPoint): WorldPoint {
    return {
      x: point.x * transform.scale + transform.ox,
      y: point.y * transform.scale + transform.oy,
    }
  }

  function screenOf(key: string): WorldPoint | null {
    const world = positions[key]
    if (!world) return null
    const base = toScreen(world)
    if (preview?.key === key) {
      return { x: base.x + preview.dx, y: base.y + preview.dy }
    }
    return base
  }

  function moveSelection(key: string, step: 1 | -1): void {
    const index = orderedKeys.indexOf(key)
    if (index === -1 || orderedKeys.length === 0) return
    const next =
      orderedKeys[(index + step + orderedKeys.length) % orderedKeys.length]
    onSelect(next)
  }

  function handleNodeKeyDown(event: React.KeyboardEvent, key: string): void {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      moveSelection(key, 1)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      moveSelection(key, -1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(key)
    } else if (event.key === 'p' || event.key === 'P') {
      const world = positions[key]
      if (world) {
        onPin(key, { x: world.x, y: world.y })
      }
    }
  }

  function handlePointerDown(event: React.PointerEvent, key: string): void {
    const world = positions[key]
    if (!world) return
    setDrag({
      key,
      startX: event.clientX,
      startY: event.clientY,
      orig: world,
    })
  }

  function handlePointerMove(event: React.PointerEvent): void {
    if (!drag) return
    setPreview({
      key: drag.key,
      dx: event.clientX - drag.startX,
      dy: event.clientY - drag.startY,
    })
  }

  function handlePointerUp(event: React.PointerEvent): void {
    if (!drag) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    const key = drag.key
    const orig = drag.orig
    setDrag(null)
    setPreview(null)
    onPin(key, {
      x: orig.x + dx / transform.scale,
      y: orig.y + dy / transform.scale,
    })
  }

  function handleBackgroundClick(event: React.MouseEvent): void {
    if (event.target === event.currentTarget) {
      onSelect(null)
    }
  }

  return (
    <svg
      role="graphics-document"
      aria-label="Atlas authoring graph"
      viewBox={`0 0 ${GRAPH_VIEW.width} ${GRAPH_VIEW.height}`}
      width="100%"
      data-scale={transform.scale}
      data-ox={transform.ox}
      data-oy={transform.oy}
      style={{ direction: 'ltr' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        setDrag(null)
        setPreview(null)
      }}
      onClick={handleBackgroundClick}
    >
      {graph.groups.map((group) => {
        const members = group.memberKeys
          .map((key) => positions[key])
          .filter((point): point is WorldPoint => Boolean(point))
        if (members.length === 0) return null
        const corners = members.map(toScreen)
        const xs = corners.map((point) => point.x)
        const ys = corners.map((point) => point.y)
        const pad = 24
        const x = Math.min(...xs) - pad
        const y = Math.min(...ys) - pad
        return (
          <g key={group.key} data-group-key={group.key}>
            <rect
              x={x}
              y={y}
              width={Math.max(...xs) - Math.min(...xs) + pad * 2}
              height={Math.max(...ys) - Math.min(...ys) + pad * 2}
              fill="none"
              stroke="#64748b"
              strokeDasharray="6 4"
            />
            <text x={x} y={y - 8} fontSize={12} fill="currentColor">
              {group.label}
            </text>
          </g>
        )
      })}
      {graph.relations.map((relation) => {
        const from = screenOf(relation.sourceKey)
        const to = screenOf(relation.targetKey)
        if (!from || !to) return null
        const incident =
          selectedKey !== null &&
          (relation.sourceKey === selectedKey ||
            relation.targetKey === selectedKey)
        const hierarchy = isHierarchy(relationTypes, relation.relationTypeKey)
        const selected = selectedRelationKey === relation.key
        return (
          <line
            key={relation.key}
            data-relation-key={relation.key}
            data-incident={incident ? 'true' : 'false'}
            data-hierarchy={hierarchy ? 'true' : 'false'}
            data-selected={selected ? 'true' : 'false'}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={hierarchy ? '#7c3aed' : '#94a3b8'}
            strokeWidth={selected ? 4 : incident ? 3 : 2}
            tabIndex={0}
            role="button"
            aria-label={`Relation ${relation.key}`}
            onClick={(event) => {
              event.stopPropagation()
              onSelectRelation?.(relation.key)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                event.stopPropagation()
                onSelectRelation?.(relation.key)
              }
            }}
          />
        )
      })}
      {visibleNodes.map((node) => {
        const centre = screenOf(node.publicKey)
        if (!centre) return null
        const selected = selectedKey === node.publicKey
        const focused = focusedKey === node.publicKey
        return (
          <g
            key={node.publicKey}
            role="graphics-symbol"
            aria-label={node.publicKey}
            tabIndex={0}
            transform={`translate(${centre.x} ${centre.y})`}
            data-key={node.publicKey}
            data-cx={centre.x}
            data-cy={centre.y}
            data-selected={selected ? 'true' : 'false'}
            data-focused={focused ? 'true' : 'false'}
            data-preview={preview?.key === node.publicKey ? 'true' : 'false'}
            onClick={(event) => {
              event.stopPropagation()
              onSelect(node.publicKey)
            }}
            onFocus={() => setFocusedKey(node.publicKey)}
            onBlur={() => setFocusedKey(null)}
            onKeyDown={(event) => handleNodeKeyDown(event, node.publicKey)}
            onPointerDown={(event) => handlePointerDown(event, node.publicKey)}
          >
            {focused ? (
              <circle
                data-focus-ring="true"
                r={18}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              />
            ) : null}
            <circle
              r={selected ? 14 : 12}
              fill={selected ? '#38bdf8' : '#0ea5e9'}
              stroke="#0c4a6e"
              strokeWidth={2}
            />
            <text y={28} fontSize={11} textAnchor="middle" fill="currentColor">
              {node.publicKey}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
