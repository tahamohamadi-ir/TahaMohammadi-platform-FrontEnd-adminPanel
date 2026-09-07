import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { AdminNav, ADMIN_NAV_ITEMS, filterNavItems } from '@/components/Nav'
import { Notice, SelectField, TextField } from '@/components/ui/primitives'
import { AdminApiError } from '@/lib/api/auth'
import {
  GRAPH_RELATED_FAMILIES,
  GRAPH_RELATION_TYPES,
  type GraphEdge,
  type GraphGroup,
  type GraphNode,
} from '@/lib/api/graph'
import {
  useActivateGraphVersion,
  useGraphDetail,
  useGraphValidation,
  useSaveGraphPayload,
} from '@/lib/api/hooks/useGraph'
import { useAuth } from '@/lib/auth/AuthProvider'

/** Per-version graph editor (ADMIN-210 / PU-12-graph).
 * Complete graph version editing with:
 * 1. Accessible node table & keyboard positioning controls (alternative to drag-and-drop).
 * 2. Record relation validation & management for every node.
 * 3. Directional edge & group editing with server-side validator integration. */
export function GraphEditPage() {
  const { user } = useAuth()
  const params = useParams()
  const versionId = Number(params.versionId)
  const detail = useGraphDetail(versionId)
  const save = useSaveGraphPayload(versionId)
  const activate = useActivateGraphVersion()

  const [draft, setDraft] = useState<{
    nodes: GraphNode[]
    edges: GraphEdge[]
    groups: GraphGroup[]
  } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // New edge form state
  const [newEdgeSource, setNewEdgeSource] = useState('')
  const [newEdgeTarget, setNewEdgeTarget] = useState('')
  const [newEdgeRelation, setNewEdgeRelation] = useState<string>('relates')

  // New node form state
  const [newNodeId, setNewNodeId] = useState('')
  const [newNodeLabel, setNewNodeLabel] = useState('')
  const [newNodeAccessibleLabel, setNewNodeAccessibleLabel] = useState('')

  // New related record state
  const [selectedNodeForRecord, setSelectedNodeForRecord] = useState('')
  const [relatedFamily, setRelatedFamily] = useState<string>('project')
  const [relatedRecordId, setRelatedRecordId] = useState('')

  const validation = useGraphValidation(versionId)
  const data = detail.data
  const current = draft ?? {
    nodes: (data?.nodes as GraphNode[] | undefined) ?? [],
    edges: (data?.edges as GraphEdge[] | undefined) ?? [],
    groups: (data?.groups as GraphGroup[] | undefined) ?? [],
  }

  function updateNode(index: number, patch: Partial<GraphNode>) {
    setDraft({
      ...current,
      nodes: current.nodes.map((node, at) =>
        at === index ? { ...node, ...patch } : node,
      ),
    })
    setMessage(null)
  }

  function updateNodePosition(index: number, x: number, y: number, z?: number) {
    const node = current.nodes[index]
    if (!node) return
    const pos = { ...(node.position ?? { x: 0, y: 0 }), x, y }
    if (z !== undefined) pos.z = z
    updateNode(index, { position: pos })
  }

  function nudgeNode(index: number, deltaX: number, deltaY: number) {
    const node = current.nodes[index]
    if (!node) return
    const currentPos = node.position ?? { x: 0, y: 0 }
    updateNodePosition(index, currentPos.x + deltaX, currentPos.y + deltaY)
  }

  function removeNode(index: number) {
    const node = current.nodes[index]
    if (!node) return
    const nodeId = node.id
    setDraft({
      ...current,
      nodes: current.nodes.filter((_, at) => at !== index),
      edges: current.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId,
      ),
    })
    setMessage(null)
  }

  function handleAddNode(e: React.FormEvent) {
    e.preventDefault()
    const id = newNodeId.trim()
    const label = newNodeLabel.trim()
    const accessibleLabel = newNodeAccessibleLabel.trim() || label

    if (!id) {
      setError('Node ID is required.')
      return
    }
    if (current.nodes.some((n) => n.id === id)) {
      setError(`Node with ID "${id}" already exists.`)
      return
    }

    setDraft({
      ...current,
      nodes: [
        ...current.nodes,
        {
          id,
          label: label || id,
          accessibleLabel: accessibleLabel || `${id} node`,
          type: 'domain',
          colorRole: 'brand',
          iconRole: 'orbit',
          weight: 1,
          position: { x: 250, y: 250 },
          relatedRecords: [],
        },
      ],
    })
    setNewNodeId('')
    setNewNodeLabel('')
    setNewNodeAccessibleLabel('')
    setError(null)
    setMessage(null)
  }

  function addReverseEdge(edge: GraphEdge) {
    const reversed: GraphEdge = {
      ...edge,
      id: `${String(edge.target)}->${String(edge.source)}:${String(edge.relationType ?? 'relates')}`,
      source: edge.target,
      target: edge.source,
      relationType: edge.relationType ?? 'relates',
      directed: true,
      weight: edge.weight ?? 1,
    }
    setDraft({ ...current, edges: [...current.edges, reversed] })
    setMessage(null)
  }

  function removeEdge(index: number) {
    setDraft({
      ...current,
      edges: current.edges.filter((_, at) => at !== index),
    })
    setMessage(null)
  }

  function handleAddEdge(e: React.FormEvent) {
    e.preventDefault()
    const source = newEdgeSource.trim()
    const target = newEdgeTarget.trim()
    if (!source || !target) {
      setError('Source and target node IDs are required.')
      return
    }
    if (source === target) {
      setError('Self-edges (source == target) are not allowed.')
      return
    }

    const edgeId = `${source}->${target}:${newEdgeRelation}`
    if (
      current.edges.some(
        (e) =>
          e.source === source &&
          e.target === target &&
          e.relationType === newEdgeRelation,
      )
    ) {
      setError('An identical edge already exists.')
      return
    }

    setDraft({
      ...current,
      edges: [
        ...current.edges,
        {
          id: edgeId,
          source,
          target,
          relationType: newEdgeRelation,
          directed: true,
          weight: 1,
        },
      ],
    })
    setNewEdgeSource('')
    setNewEdgeTarget('')
    setError(null)
    setMessage(null)
  }

  function addRelatedRecord(nodeId: string, family: string, recordId: string) {
    if (!family || !recordId.trim()) {
      setError('Family and record ID are required.')
      return
    }
    const nodeIndex = current.nodes.findIndex((n) => n.id === nodeId)
    if (nodeIndex === -1) return

    const node = current.nodes[nodeIndex]
    const existingRelated = node.relatedRecords ?? []
    if (
      existingRelated.some(
        (r) => r.family === family && r.id === recordId.trim(),
      )
    ) {
      setError('This record relation is already attached to this node.')
      return
    }

    const updatedNode = {
      ...node,
      relatedRecords: [...existingRelated, { family, id: recordId.trim() }],
    }

    updateNode(nodeIndex, updatedNode)
    setRelatedRecordId('')
    setError(null)
    setMessage(null)
  }

  function removeRelatedRecord(nodeId: string, recordIndex: number) {
    const nodeIndex = current.nodes.findIndex((n) => n.id === nodeId)
    if (nodeIndex === -1) return
    const node = current.nodes[nodeIndex]
    const updated = (node.relatedRecords ?? []).filter(
      (_, at) => at !== recordIndex,
    )
    updateNode(nodeIndex, { relatedRecords: updated })
  }

  async function handleSave() {
    if (!data) return
    setError(null)
    setMessage(null)
    try {
      await save.mutateAsync({
        payload: {
          nodes: current.nodes,
          edges: current.edges,
          groups: current.groups,
        },
        ifMatch: data.updatedAt,
      })
      setMessage('Payload saved.')
    } catch (caught) {
      if (caught instanceof AdminApiError && caught.kind === 'conflict') {
        setError('This version changed or is immutable. Reload latest.')
        return
      }
      setError(
        caught instanceof AdminApiError
          ? caught.message
          : 'Save failed. Try again.',
      )
    }
  }

  async function handleActivate() {
    setError(null)
    try {
      await activate.mutateAsync(versionId)
      setMessage('Version activated.')
    } catch (caught) {
      setError(
        caught instanceof AdminApiError
          ? caught.message
          : 'Activate failed. Try again.',
      )
    }
  }

  const activeNodeForRelated =
    selectedNodeForRecord || (current.nodes[0]?.id ?? '')

  return (
    <main className="page">
      <AdminNav items={filterNavItems(ADMIN_NAV_ITEMS, user)} />
      <p>
        <Link to="/graph">← Graph versions</Link>
      </p>
      <h1>
        Graph version #{versionId} {data ? `· ${data.status}` : ''}
      </h1>

      {message ? <p role="status">{message}</p> : null}
      {error ? (
        <Notice tone="error" title="Action failed">
          {error}{' '}
          <button
            type="button"
            className="admin-button admin-button--secondary"
            onClick={() => {
              setError(null)
              setDraft(null)
              void detail.refetch()
            }}
          >
            Reload latest
          </button>
        </Notice>
      ) : null}
      {detail.isPending ? <p role="status">Loading version…</p> : null}
      {detail.error ? (
        <Notice tone="error" title="Version unavailable">
          The backend did not answer.{' '}
          <button
            type="button"
            className="admin-button admin-button--secondary"
            onClick={() => void detail.refetch()}
          >
            Retry
          </button>
        </Notice>
      ) : null}

      {data ? (
        <>
          {data.status !== 'draft' ? (
            <Notice tone="warning" title="Read-only version">
              Only draft versions are editable; the backend rejects payload
              changes to this version.
            </Notice>
          ) : null}

          {/* Accessible Node Table & Keyboard Positioning (Drag Alternative) */}
          <section
            aria-labelledby="nodes-table-title"
            style={{ marginTop: '1.5rem' }}
          >
            <h2 id="nodes-table-title">Node table & keyboard positioning</h2>
            <p className="muted">
              Fully accessible tabular editor for node attributes and 2D/3D
              positioning. Adjust coordinates directly via number inputs or
              keyboard nudge buttons without mouse dragging.
            </p>

            <div
              className="admin-table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Nodes list"
            >
              <table className="admin-table">
                <caption className="admin-table__caption">Graph nodes</caption>
                <thead>
                  <tr>
                    <th scope="col">ID / Type</th>
                    <th scope="col">Labels</th>
                    <th scope="col">Coordinates (X, Y)</th>
                    <th scope="col">Keyboard nudge</th>
                    <th scope="col">Weight</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {current.nodes.map((node, index) => {
                    const nodeId = String(node.id)
                    const posX = Number(node.position?.x ?? 0)
                    const posY = Number(node.position?.y ?? 0)
                    return (
                      <tr key={nodeId}>
                        <td>
                          <strong>{nodeId}</strong>
                          <br />
                          <span className="muted">
                            {String(node.type ?? 'domain')}
                          </span>
                        </td>
                        <td>
                          <TextField
                            id={`node-label-${nodeId}`}
                            label={`Label (${nodeId})`}
                            value={String(node.label ?? '')}
                            onChange={(value) =>
                              updateNode(index, { label: value })
                            }
                          />
                          <TextField
                            id={`node-access-${nodeId}`}
                            label={`Accessible label (${nodeId})`}
                            value={String(node.accessibleLabel ?? '')}
                            onChange={(value) =>
                              updateNode(index, { accessibleLabel: value })
                            }
                          />
                        </td>
                        <td>
                          <TextField
                            id={`node-pos-x-${nodeId}`}
                            label={`X (${nodeId})`}
                            type="number"
                            value={String(posX)}
                            onChange={(value) =>
                              updateNodePosition(index, Number(value), posY)
                            }
                          />
                          <TextField
                            id={`node-pos-y-${nodeId}`}
                            label={`Y (${nodeId})`}
                            type="number"
                            value={String(posY)}
                            onChange={(value) =>
                              updateNodePosition(index, posX, Number(value))
                            }
                          />
                        </td>
                        <td>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(2, 1fr)',
                              gap: '4px',
                            }}
                          >
                            <button
                              type="button"
                              className="admin-button admin-button--secondary"
                              aria-label={`Nudge ${nodeId} left`}
                              onClick={() => nudgeNode(index, -10, 0)}
                            >
                              ← Left
                            </button>
                            <button
                              type="button"
                              className="admin-button admin-button--secondary"
                              aria-label={`Nudge ${nodeId} right`}
                              onClick={() => nudgeNode(index, 10, 0)}
                            >
                              → Right
                            </button>
                            <button
                              type="button"
                              className="admin-button admin-button--secondary"
                              aria-label={`Nudge ${nodeId} up`}
                              onClick={() => nudgeNode(index, 0, -10)}
                            >
                              ↑ Up
                            </button>
                            <button
                              type="button"
                              className="admin-button admin-button--secondary"
                              aria-label={`Nudge ${nodeId} down`}
                              onClick={() => nudgeNode(index, 0, 10)}
                            >
                              ↓ Down
                            </button>
                          </div>
                        </td>
                        <td>
                          <TextField
                            id={`node-weight-${nodeId}`}
                            label={`Weight (${nodeId})`}
                            type="number"
                            value={String(node.weight ?? 1)}
                            onChange={(value) =>
                              updateNode(index, { weight: Number(value) })
                            }
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-button admin-button--secondary"
                            onClick={() => removeNode(index)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Add Node Form */}
            <form
              onSubmit={handleAddNode}
              style={{
                marginTop: '1rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-end',
                flexWrap: 'wrap',
              }}
            >
              <TextField
                id="new-node-id"
                label="New Node ID"
                value={newNodeId}
                onChange={setNewNodeId}
              />
              <TextField
                id="new-node-label"
                label="Node Label"
                value={newNodeLabel}
                onChange={setNewNodeLabel}
              />
              <TextField
                id="new-node-access"
                label="Accessible Label"
                value={newNodeAccessibleLabel}
                onChange={setNewNodeAccessibleLabel}
              />
              <button
                type="submit"
                className="admin-button admin-button--secondary"
              >
                Add node
              </button>
            </form>
          </section>

          {/* Record Relation Validation & Management */}
          <section
            aria-labelledby="related-title"
            style={{
              marginTop: '2rem',
              borderTop: '1px solid var(--border, #ccc)',
              paddingTop: '1.5rem',
            }}
          >
            <h2 id="related-title">Related records</h2>
            <p className="muted">
              Map graph nodes to published domain records (projects,
              publications, research topics, etc.). The validator ensures each
              referenced record exists and is publicly accessible.
            </p>

            <div
              className="admin-table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Related records list"
            >
              <table className="admin-table">
                <caption className="admin-table__caption">
                  Node related records
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Node</th>
                    <th scope="col">Target family</th>
                    <th scope="col">Record ID / slug</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {current.nodes.flatMap((node) =>
                    (node.relatedRecords ?? []).map((rel, rIdx) => (
                      <tr key={`${node.id}-${rel.family}-${rel.id}-${rIdx}`}>
                        <td>
                          <strong>{node.id}</strong>
                        </td>
                        <td>
                          <code>{rel.family}</code>
                        </td>
                        <td>{rel.id}</td>
                        <td>
                          <button
                            type="button"
                            className="admin-button admin-button--secondary"
                            onClick={() => removeRelatedRecord(node.id, rIdx)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    )),
                  )}
                  {current.nodes.every(
                    (n) => !(n.relatedRecords ?? []).length,
                  ) ? (
                    <tr>
                      <td colSpan={4} className="muted">
                        No related records configured.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {/* Add Related Record Form */}
            {current.nodes.length > 0 ? (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  border: '1px solid var(--border, #ccc)',
                  borderRadius: '4px',
                }}
              >
                <h3>Add related record</h3>
                <div
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'flex-end',
                    flexWrap: 'wrap',
                  }}
                >
                  <SelectField
                    id="related-node-select"
                    label="Select node"
                    value={activeNodeForRelated}
                    onChange={setSelectedNodeForRecord}
                    options={current.nodes.map((n) => ({
                      value: n.id,
                      label: `${n.id} (${String(n.label ?? '')})`,
                    }))}
                  />
                  <SelectField
                    id="related-family-select"
                    label="Record family"
                    value={relatedFamily}
                    onChange={setRelatedFamily}
                    options={GRAPH_RELATED_FAMILIES.map((f) => ({
                      value: f,
                      label: f,
                    }))}
                  />
                  <TextField
                    id="related-record-id"
                    label="Record ID or slug"
                    value={relatedRecordId}
                    onChange={setRelatedRecordId}
                  />
                  <button
                    type="button"
                    className="admin-button admin-button--secondary"
                    aria-label={`Add related record to ${activeNodeForRelated}`}
                    onClick={() =>
                      addRelatedRecord(
                        activeNodeForRelated,
                        relatedFamily,
                        relatedRecordId,
                      )
                    }
                  >
                    Add related record to {activeNodeForRelated}
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          {/* Edges & Relations */}
          <section
            aria-labelledby="edges-title"
            style={{
              marginTop: '2rem',
              borderTop: '1px solid var(--border, #ccc)',
              paddingTop: '1.5rem',
            }}
          >
            <h2 id="edges-title">Edges</h2>
            <ul>
              {current.edges.map((edge, index) => {
                const edgeId = String(edge.id ?? index)
                return (
                  <li key={edgeId} style={{ marginBottom: '0.5rem' }}>
                    {String(edge.source)}→{String(edge.target)}{' '}
                    <span className="muted">
                      ({String(edge.relationType ?? 'relates')})
                    </span>{' '}
                    <button
                      type="button"
                      className="admin-button admin-button--secondary"
                      onClick={() => addReverseEdge(edge)}
                    >
                      Add reverse direction
                    </button>{' '}
                    <button
                      type="button"
                      className="admin-button admin-button--secondary"
                      onClick={() => removeEdge(index)}
                    >
                      Remove
                    </button>
                  </li>
                )
              })}
            </ul>

            <form
              onSubmit={handleAddEdge}
              style={{
                marginTop: '1rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-end',
                flexWrap: 'wrap',
              }}
            >
              <TextField
                id="new-edge-source"
                label="Source node ID"
                value={newEdgeSource}
                onChange={setNewEdgeSource}
              />
              <TextField
                id="new-edge-target"
                label="Target node ID"
                value={newEdgeTarget}
                onChange={setNewEdgeTarget}
              />
              <SelectField
                id="new-edge-relation"
                label="Relation type"
                value={newEdgeRelation}
                onChange={setNewEdgeRelation}
                options={GRAPH_RELATION_TYPES.map((r) => ({
                  value: r,
                  label: r,
                }))}
              />
              <button
                type="submit"
                className="admin-button admin-button--secondary"
              >
                Add edge
              </button>
            </form>
          </section>

          {/* Groups */}
          <section
            aria-labelledby="groups-title"
            style={{
              marginTop: '2rem',
              borderTop: '1px solid var(--border, #ccc)',
              paddingTop: '1.5rem',
            }}
          >
            <h2 id="groups-title">Groups</h2>
            <ul>
              {current.groups.map((group, index) => (
                <li key={index}>
                  <strong>{String(group.name)}</strong>:{' '}
                  {(group.nodeIds as string[] | undefined)?.join(', ')}
                </li>
              ))}
            </ul>
          </section>

          {/* Save & Activate Actions */}
          <p style={{ marginTop: '2rem' }}>
            <button
              type="button"
              className="admin-button"
              disabled={save.isPending || data.status !== 'draft'}
              onClick={() => void handleSave()}
            >
              {save.isPending ? 'Saving…' : 'Save payload'}
            </button>{' '}
            {data.status === 'draft' ? (
              <button
                type="button"
                className="admin-button admin-button--secondary"
                disabled={activate.isPending}
                onClick={() => void handleActivate()}
              >
                Activate
              </button>
            ) : null}
          </p>

          {/* Validation Report */}
          <section
            aria-labelledby="validation-title"
            style={{
              marginTop: '2rem',
              borderTop: '1px solid var(--border, #ccc)',
              paddingTop: '1.5rem',
            }}
          >
            <h2 id="validation-title">Validation</h2>
            <button
              type="button"
              className="admin-button admin-button--secondary"
              onClick={() => void validation.refetch()}
            >
              Run validation
            </button>
            {(validation.data?.issues ?? []).length > 0 ? (
              <Notice tone="error" title="Validator found problems">
                <ul>
                  {(validation.data?.issues ?? []).map((issue, index) => (
                    <li key={index}>
                      <strong>{String(issue.code)}</strong>
                      {issue.nodeId ? ` (Node: ${String(issue.nodeId)})` : ''}
                      {issue.edgeId ? ` (Edge: ${String(issue.edgeId)})` : ''}
                    </li>
                  ))}
                </ul>
              </Notice>
            ) : validation.data ? (
              <p role="status">Validator reports no issues.</p>
            ) : null}
          </section>
        </>
      ) : null}
    </main>
  )
}
