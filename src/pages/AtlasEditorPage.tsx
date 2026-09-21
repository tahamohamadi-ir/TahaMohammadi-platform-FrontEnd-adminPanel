import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'

import { NodeForm } from '@/components/atlas/NodeForm'
import { Notice, SelectField } from '@/components/ui/primitives'
import {
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

/** Atlas editor host (Plan B Task 11 — minimal).
 *
 * Hosts the node form with live data: version revision, graph nodes and
 * groups, taxonomy. The full editor shell (authoring graph with selection,
 * relation form/table, validation panel, publish) arrives in later tasks;
 * until then a plain node picker selects the edited node.
 */
export function AtlasEditorPage() {
  const { versionId } = useParams()
  const id = Number(versionId)
  const validId = Number.isInteger(id) && id > 0
  const queryClient = useQueryClient()
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

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
        </>
      ) : null}
    </main>
  )
}
