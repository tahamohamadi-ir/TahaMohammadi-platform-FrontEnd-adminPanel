import type { AtlasNodeRow } from '@/lib/api/atlas'

export interface WorldPoint {
  x: number
  y: number
}

/** Grid spacing (world units) for nodes without a stored pin. */
const GRID_SPACING = 100

const VIEW_WIDTH = 800
const VIEW_HEIGHT = 500
const VIEW_PAD = 40

export const GRAPH_VIEW = {
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  pad: VIEW_PAD,
} as const

function pinOf(node: AtlasNodeRow): WorldPoint | null {
  const pin = node.pin as Record<string, unknown> | null | undefined
  const x = pin?.['x']
  const y = pin?.['y']
  if (typeof x === 'number' && typeof y === 'number') {
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { x, y }
    }
  }
  return null
}

/** Deterministic world positions for the given nodes.
 *
 * Nodes sort by public key; a stored pin wins, otherwise the node takes
 * the next slot of a fixed grid. Pure function of the input — the same
 * rows always produce the same positions.
 */
export function computeNodePositions(
  nodes: AtlasNodeRow[],
): Record<string, WorldPoint> {
  const ordered = [...nodes].sort((a, b) =>
    a.publicKey < b.publicKey ? -1 : a.publicKey > b.publicKey ? 1 : 0,
  )
  const columns = Math.max(1, Math.ceil(Math.sqrt(ordered.length)))
  const positions: Record<string, WorldPoint> = {}
  ordered.forEach((node, index) => {
    positions[node.publicKey] = pinOf(node) ?? {
      x: (index % columns) * GRID_SPACING,
      y: Math.floor(index / columns) * GRID_SPACING,
    }
  })
  return positions
}

export interface GraphTransform {
  scale: number
  ox: number
  oy: number
}

/** The single affine transform world → screen for one graph render. */
export function computeTransform(
  positions: Record<string, WorldPoint>,
): GraphTransform {
  const points = Object.values(positions)
  if (points.length === 0) {
    return { scale: 1, ox: VIEW_PAD, oy: VIEW_PAD }
  }
  let minX = points[0].x
  let maxX = points[0].x
  let minY = points[0].y
  let maxY = points[0].y
  for (const point of points) {
    if (point.x < minX) minX = point.x
    if (point.x > maxX) maxX = point.x
    if (point.y < minY) minY = point.y
    if (point.y > maxY) maxY = point.y
  }
  const spanX = Math.max(1, maxX - minX)
  const spanY = Math.max(1, maxY - minY)
  const scale = Math.min(
    (VIEW_WIDTH - VIEW_PAD * 2) / spanX,
    (VIEW_HEIGHT - VIEW_PAD * 2) / spanY,
  )
  const extraX = VIEW_WIDTH - VIEW_PAD * 2 - spanX * scale
  const extraY = VIEW_HEIGHT - VIEW_PAD * 2 - spanY * scale
  return {
    scale,
    ox: VIEW_PAD + extraX / 2 - minX * scale,
    oy: VIEW_PAD + extraY / 2 - minY * scale,
  }
}
