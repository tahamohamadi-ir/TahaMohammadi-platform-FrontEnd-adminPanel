import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EyeIcon, NetworkIcon } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { NodeForm } from '@/components/atlas/NodeForm'
import { AuthoringGraph } from '@/components/atlas/AuthoringGraph'
import {
  PublishDialog,
  type PublishResult,
} from '@/components/atlas/PublishDialog'
import { RelationForm } from '@/components/atlas/RelationForm'
import { RelationTable } from '@/components/atlas/RelationTable'
import { ValidationPanel } from '@/components/atlas/ValidationPanel'
import { Notice, SelectField } from '@/components/ui/primitives'
import { EmptyState, LoadingState } from '@/components/ui/states'
import {
  deleteAtlasRelation,
  fetchAtlasGraph,
  fetchAtlasVersion,
  listTaxonomy,
  updateAtlasNode,
  validateAtlasVersion,
  type AtlasValidationOut,
} from '@/lib/api/atlas'
import { AdminApiError } from '@/lib/api/auth'

import '@/components/atlas/atlas-editor.css'

function toErrorMessage(caught: unknown, fallback: string): string {
  if (caught instanceof AdminApiError) {
    return caught.message
  }
  return fallback
}

/** Atlas editor host (Plan B Tasks 11–12; three-pane layout in Phase 6).
 *
 * Follows the graph-editor concept as layout only: an outline rail (counts,
 * node picker, validation and publish), the deterministic 2D authoring graph
 * with relations underneath, and a node-settings drawer. Hosts the node form
 * plus the relation form/table with live data: version revision, graph
 * nodes/relations/groups, taxonomy. The graph selects nodes/relations into
 * the same state the pickers drive and writes pins through the node PATCH
 * endpoint; Inspect selects the relation's source node as the
 * graph-selection bridge. A non-draft version renders a read-only status
 * view.
 */
export function AtlasEditorPage() {
  const { versionId } = useParams()
  const id = Number(versionId)
  const validId = Number.isInteger(id) && id > 0
  const queryClient = useQueryClient()
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [selectedRelationKey, setSelectedRelationKey] = useState<string | null>(
    null,
  )
  const [relationDeleteError, setRelationDeleteError] = useState<string | null>(
    null,
  )
  const [pinError, setPinError] = useState<string | null>(null)
  const [showPublish, setShowPublish] = useState(false)
  const [publishedResult, setPublishedResult] = useState<PublishResult | null>(
    null,
  )
  const [blockedOverride, setBlockedOverride] =
    useState<AtlasValidationOut | null>(null)

  const versionQuery = useQuery({
    queryKey: ['atlas', 'versions', validId ? id : 'unknown'],
    queryFn: () => fetchAtlasVersion(id),
    enabled: validId,
  })
  const graphQuery = useQuery({
    queryKey: ['atlas', 'versions', validId ? id : 'unknown', 'graph'],
    queryFn: () => fetchAtlasGraph(id),
    enabled: validId,
  })
  const taxonomyQuery = useQuery({
    queryKey: ['atlas', 'taxonomy'],
    queryFn: listTaxonomy,
    enabled: validId,
  })
  const validationQuery = useQuery({
    queryKey: ['atlas', 'versions', validId ? id : 'unknown', 'validation'],
    queryFn: () => validateAtlasVersion(id),
    enabled: validId,
  })

  const relationDeleteMutation = useMutation({
    mutationFn: (key: string) => deleteAtlasRelation(id, key, revision),
    onSuccess: (_data, key) => {
      setRelationDeleteError(null)
      if (selectedRelationKey === key) {
        setSelectedRelationKey(null)
      }
      refreshAfterMutation()
    },
    onError: (caught) => {
      setRelationDeleteError(toErrorMessage(caught, 'Failed to delete.'))
    },
  })

  const pinMutation = useMutation({
    mutationFn: ({
      key,
      pin,
    }: {
      key: string
      pin: { x: number; y: number }
    }) => updateAtlasNode(id, key, { pin }, revision),
    onSuccess: () => {
      setPinError(null)
      refreshAfterMutation()
    },
    onError: (caught) => {
      // The graph is controlled by the query data, so a failed write
      // keeps the stored position and only communicates the failure.
      setPinError(toErrorMessage(caught, 'Failed to save the pin.'))
    },
  })

  if (!validId) {
    return (
      <main className="page">
        <h1>Atlas editor</h1>
        <Notice tone="error" title="Unknown Atlas version">
          {`No Atlas version matches ${versionId ?? 'this path'}.`}
        </Notice>
      </main>
    )
  }

  const pending =
    versionQuery.isPending ||
    graphQuery.isPending ||
    taxonomyQuery.isPending ||
    validationQuery.isPending
  const error =
    versionQuery.error ??
    graphQuery.error ??
    taxonomyQuery.error ??
    validationQuery.error ??
    null
  const version = versionQuery.data ?? null
  const isDraft = version?.status === 'draft'
  const publishedAt =
    (version as { publishedAt?: string } | null)?.publishedAt ?? null
  const nodes = graphQuery.data?.nodes ?? []
  const selected =
    nodes.find((row) => row.publicKey === selectedKey) ?? nodes[0] ?? null
  const revision = versionQuery.data?.revision ?? ''
  const relations = graphQuery.data?.relations ?? []
  const relationTypes = taxonomyQuery.data?.relationTypes ?? []
  const editingRelation =
    relations.find((row) => row.key === selectedRelationKey) ?? null
  const validation = blockedOverride ??
    validationQuery.data ?? { blocking: [], warnings: [] }

  function refreshAfterMutation() {
    void queryClient.invalidateQueries({
      queryKey: ['atlas', 'versions', id],
    })
    void queryClient.invalidateQueries({
      queryKey: ['atlas', 'versions'],
    })
  }

  return (
    <main className="page atlas-editor">
      <header className="atlas-editor__header">
        <div className="min-w-0">
          <h1 className="mb-1">Atlas editor</h1>
          {version ? (
            <p className="admin-meta m-0">
              <span className="font-semibold">
                {version.label || `Version ${id}`}
              </span>
              <span className={`badge badge--${version.status}`}>
                {version.status}
              </span>
              <span className="muted">Revision {revision}</span>
            </p>
          ) : null}
        </div>
        <Link
          className="admin-button admin-button--secondary"
          to={`/atlas/${id}/preview`}
        >
          <EyeIcon className="size-4" aria-hidden="true" />
          2D preview
        </Link>
      </header>
      {pending ? (
        <LoadingState label="Loading Atlas editor…" variant="cards" />
      ) : null}
      {error ? (
        <Notice tone="error" title="Failed to load the Atlas editor">
          {toErrorMessage(error, 'Failed to load the Atlas editor.')}
        </Notice>
      ) : null}
      {!pending && !error && !isDraft ? (
        <>
          {version?.status === 'active' ? (
            <Notice tone="success" title="This version is published">
              Published {publishedAt ?? revision}. The active version is
              read-only — clone it to author a new draft.
            </Notice>
          ) : (
            <Notice tone="info" title="This version is archived">
              Archived versions are read-only.
            </Notice>
          )}
          {publishedResult ? (
            <p role="status">
              Published {publishedResult.publishedAt}
              {publishedResult.enqueuedPublicationJob !== null
                ? ` · Publication job ${publishedResult.enqueuedPublicationJob}`
                : null}
            </p>
          ) : null}
        </>
      ) : null}
      {!pending && !error && isDraft ? (
        <div className="atlas-workspace">
          <aside
            className="atlas-pane atlas-pane--rail"
            aria-label="Atlas outline"
          >
            <dl className="atlas-stats">
              <div>
                <dt>Nodes</dt>
                <dd>{nodes.length}</dd>
              </div>
              <div>
                <dt>Relations</dt>
                <dd>{relations.length}</dd>
              </div>
              <div>
                <dt>Blocking</dt>
                <dd>{validation.blocking.length}</dd>
              </div>
            </dl>
            <SelectField
              id="atlas-editor-node"
              label="Node"
              value={selected?.publicKey ?? ''}
              onChange={(value) => setSelectedKey(value)}
              options={nodes.map((row) => ({
                value: row.publicKey,
                label: row.publicKey,
              }))}
            />
            <ValidationPanel
              issues={validation}
              onGoTo={(issue) => {
                if (issue.nodeKey) {
                  setSelectedKey(issue.nodeKey)
                } else if (issue.relationKey) {
                  setSelectedRelationKey(issue.relationKey)
                }
              }}
              onPublish={() => setShowPublish(true)}
            />
            {showPublish && revision !== '' ? (
              <PublishDialog
                versionId={id}
                revision={revision}
                versionLabel={version?.label ?? `version ${id}`}
                nodeCount={version?.nodeCount ?? nodes.length}
                relationCount={version?.relationCount ?? relations.length}
                warningCount={validation.warnings.length}
                onPublished={(result) => {
                  setPublishedResult(result)
                  setShowPublish(false)
                  setBlockedOverride(null)
                  refreshAfterMutation()
                }}
                onValidationBlocked={(issues) => {
                  setBlockedOverride({
                    blocking: issues,
                    warnings: validationQuery.data?.warnings ?? [],
                  })
                }}
                onReload={() => {
                  setBlockedOverride(null)
                  setShowPublish(false)
                  refreshAfterMutation()
                }}
                onClose={() => setShowPublish(false)}
              />
            ) : null}
          </aside>

          <section
            className="atlas-pane atlas-pane--canvas"
            aria-labelledby="atlas-graph-heading"
          >
            <h2 id="atlas-graph-heading" className="atlas-pane__title">
              Authoring graph
            </h2>
            <div className="atlas-canvas">
              <AuthoringGraph
                graph={{
                  nodes,
                  relations,
                  groups: graphQuery.data?.groups ?? [],
                }}
                relationTypes={relationTypes}
                selectedKey={selectedKey}
                selectedRelationKey={selectedRelationKey}
                onSelect={(key) => setSelectedKey(key)}
                onSelectRelation={(key) => setSelectedRelationKey(key)}
                onPin={(key, pin) => {
                  setPinError(null)
                  pinMutation.mutate({ key, pin })
                }}
              />
            </div>
            {pinError ? (
              <Notice tone="error" title="Failed to save the pin">
                {pinError}
              </Notice>
            ) : null}

            <h2 className="atlas-pane__title atlas-pane__title--spaced">
              Relations
            </h2>
            {revision !== '' ? (
              <RelationForm
                key={editingRelation?.key ?? 'new-relation'}
                versionId={id}
                revision={revision}
                relation={editingRelation}
                nodes={nodes}
                nodeTypes={taxonomyQuery.data?.nodeTypes ?? []}
                relationTypes={relationTypes}
                onSaved={(row) => {
                  setSelectedRelationKey(row.key)
                  refreshAfterMutation()
                }}
                onDeleted={() => {
                  setSelectedRelationKey(null)
                  refreshAfterMutation()
                }}
              />
            ) : null}
            <RelationTable
              relations={relations}
              nodes={nodes}
              nodeTypes={taxonomyQuery.data?.nodeTypes ?? []}
              relationTypes={relationTypes}
              onEdit={(key) => setSelectedRelationKey(key)}
              onDelete={(key) => {
                setRelationDeleteError(null)
                relationDeleteMutation.mutate(key)
              }}
              onInspect={(key) => {
                const target = relations.find((row) => row.key === key)
                if (target) {
                  setSelectedKey(target.sourceKey)
                }
              }}
            />
            {relationDeleteError ? (
              <Notice tone="error" title="Failed to delete the relation">
                {relationDeleteError}
              </Notice>
            ) : null}
          </section>

          <aside
            className="atlas-pane atlas-pane--drawer"
            aria-labelledby="atlas-node-settings-heading"
          >
            <h2 id="atlas-node-settings-heading" className="atlas-pane__title">
              Node settings
            </h2>
            {selected !== null && revision !== '' ? (
              <NodeForm
                key={selected.publicKey}
                versionId={id}
                revision={revision}
                node={selected}
                nodeTypes={taxonomyQuery.data?.nodeTypes ?? []}
                groups={graphQuery.data?.groups ?? []}
                onSaved={refreshAfterMutation}
                onDeleted={() => {
                  setSelectedKey(null)
                  refreshAfterMutation()
                }}
              />
            ) : (
              <EmptyState
                icon={NetworkIcon}
                title="No nodes in this version yet."
              />
            )}
          </aside>
        </div>
      ) : null}
    </main>
  )
}
