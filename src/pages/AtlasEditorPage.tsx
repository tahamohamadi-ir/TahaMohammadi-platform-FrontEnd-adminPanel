import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'

import { NodeForm } from '@/components/atlas/NodeForm'
import { RelationForm } from '@/components/atlas/RelationForm'
import { RelationTable } from '@/components/atlas/RelationTable'
import { Notice, SelectField } from '@/components/ui/primitives'
import {
  deleteAtlasRelation,
  fetchAtlasGraph,
  fetchAtlasVersion,
  listTaxonomy,
} from '@/lib/api/atlas'
import { AdminApiError } from '@/lib/api/auth'

function toErrorMessage(caught: unknown, fallback: string): string {
  if (caught instanceof AdminApiError) {
    return caught.message
  }
  return fallback
}

/** Atlas editor host (Plan B Tasks 11–12 — minimal).
 *
 * Hosts the node form plus the relation form/table with live data: version
 * revision, graph nodes/relations/groups, taxonomy. The full editor shell
 * (authoring graph with selection, validation panel, publish) arrives in
 * later tasks; until then plain pickers select the edited node/relation,
 * and Inspect selects the relation's source node as the interim bridge to
 * graph selection (Task 14).
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
    versionQuery.isPending || graphQuery.isPending || taxonomyQuery.isPending
  const error =
    versionQuery.error ?? graphQuery.error ?? taxonomyQuery.error ?? null
  const nodes = graphQuery.data?.nodes ?? []
  const selected =
    nodes.find((row) => row.publicKey === selectedKey) ?? nodes[0] ?? null
  const revision = versionQuery.data?.revision ?? ''
  const relations = graphQuery.data?.relations ?? []
  const relationTypes = taxonomyQuery.data?.relationTypes ?? []
  const editingRelation =
    relations.find((row) => row.key === selectedRelationKey) ?? null

  function refreshAfterMutation() {
    void queryClient.invalidateQueries({
      queryKey: ['atlas', 'versions', id],
    })
    void queryClient.invalidateQueries({
      queryKey: ['atlas', 'versions'],
    })
  }

  return (
    <main className="page">
      <h1>Atlas editor</h1>
      {pending ? <p role="status">Loading Atlas editor…</p> : null}
      {error ? (
        <Notice tone="error" title="Failed to load the Atlas editor">
          {toErrorMessage(error, 'Failed to load the Atlas editor.')}
        </Notice>
      ) : null}
      {!pending && !error ? (
        <>
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
            <p>No nodes in this version yet.</p>
          )}

          <h2>Relations</h2>
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
        </>
      ) : null}
    </main>
  )
}
