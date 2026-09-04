import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { AdminNav, ADMIN_NAV_ITEMS, filterNavItems } from '@/components/Nav'
import { Notice, TextField } from '@/components/ui/primitives'
import { AdminApiError } from '@/lib/api/auth'
import type { GraphEdge, GraphNode } from '@/lib/api/graph'
import {
  useActivateGraphVersion,
  useGraphDetail,
  useGraphValidation,
  useSaveGraphPayload,
} from '@/lib/api/hooks/useGraph'
import { useAuth } from '@/lib/auth/AuthProvider'

/** Per-version graph editor (ADMIN-210). Edits the backend's own camel payload
 * shape (nodes/edges/groups exactly as the API serializes them) on DRAFT
 * versions only; activation and validation always go through the dedicated
 * backend operations. The tracked design authority is a visual reference for
 * the public graph, never a schema source. */
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
    groups: GraphNode[]
  } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newEdge, setNewEdge] = useState('')

  const validation = useGraphValidation(versionId)
  const data = detail.data
  const current = draft ?? {
    nodes: data?.nodes ?? [],
    edges: data?.edges ?? [],
    groups: data?.groups ?? [],
  }

  function updateNode(index: number, patch: Record<string, unknown>) {
    setDraft({
      ...current,
      nodes: current.nodes.map((node, at) =>
        at === index ? { ...node, ...patch } : node,
      ),
    })
    setMessage(null)
  }

  function addReverseEdge(edge: GraphEdge) {
    const reversed: GraphEdge = {
      ...edge,
      id: `${String(edge.target)}->${String(edge.source)}`,
      source: edge.target,
      target: edge.source,
    }
    setDraft({ ...current, edges: [...current.edges, reversed] })
    setMessage(null)
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

          <section aria-labelledby="nodes-title">
            <h2 id="nodes-title">Nodes</h2>
            {current.nodes.map((node, index) => {
              const nodeId = String(node.id)
              const label = String(node.label ?? '')
              return (
                <div key={nodeId} className="admin-field">
                  <p>
                    <strong>{nodeId}</strong>{' '}
                    <span className="muted">{String(node.type ?? '')}</span>
                  </p>
                  <TextField
                    id={`node-label-${nodeId}`}
                    label={`Label (${nodeId})`}
                    defaultValue={label}
                    onChange={(value) => updateNode(index, { label: value })}
                  />
                  <TextField
                    id={`node-weight-${nodeId}`}
                    label={`Weight (${nodeId})`}
                    type="number"
                    defaultValue={String(node.weight ?? 0)}
                    onChange={(value) =>
                      updateNode(index, { weight: Number(value) })
                    }
                  />
                </div>
              )
            })}
          </section>

          <section aria-labelledby="edges-title">
            <h2 id="edges-title">Edges</h2>
            <ul>
              {current.edges.map((edge, index) => {
                const edgeId = String(edge.id ?? index)
                return (
                  <li key={edgeId}>
                    {String(edge.source)}→{String(edge.target)}{' '}
                    <span className="muted">
                      {String(edge.relationType ?? '')}
                    </span>{' '}
                    <button
                      type="button"
                      className="admin-button admin-button--secondary"
                      onClick={() => addReverseEdge(edge)}
                    >
                      Add reverse direction
                    </button>
                  </li>
                )
              })}
            </ul>
            <TextField
              id="new-edge-source"
              label="New direction (source->target)"
              value={newEdge}
              onChange={setNewEdge}
              description="Example: impact->research"
            />
            <button
              type="button"
              className="admin-button admin-button--secondary"
              onClick={() => {
                const [source, target] = newEdge
                  .split('->')
                  .map((part) => part.trim())
                if (!source || !target) {
                  setError('Use the source->target form to add an edge.')
                  return
                }
                setDraft({
                  ...current,
                  edges: [
                    ...current.edges,
                    {
                      id: `${source}->${target}`,
                      source,
                      target,
                      relationType: 'relates',
                      directed: true,
                      weight: 1,
                    },
                  ],
                })
                setNewEdge('')
              }}
            >
              Add edge
            </button>
          </section>

          <section aria-labelledby="groups-title">
            <h2 id="groups-title">Groups</h2>
            <ul>
              {current.groups.map((group, index) => (
                <li key={index}>
                  {String(group.name)}:{' '}
                  {(group.nodeIds as string[] | undefined)?.join(', ')}
                </li>
              ))}
            </ul>
          </section>

          <p>
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

          <section aria-labelledby="validation-title">
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
                      {String(issue.code)}
                      {issue.nodeId ? ` — ${String(issue.nodeId)}` : ''}
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
