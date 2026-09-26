import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  NodeTypeForm,
  RelationTypeForm,
} from '@/components/atlas/TaxonomyForms'
import { Notice, Table } from '@/components/ui/primitives'
import {
  listTaxonomy,
  type AtlasNodeTypeRow,
  type AtlasRelationTypeRow,
} from '@/lib/api/atlas'
import { AdminApiError } from '@/lib/api/auth'

/** Stable key for the Atlas taxonomy — shared with the editor host. */
export const ATLAS_TAXONOMY_QUERY_KEY = ['atlas', 'taxonomy'] as const

function toErrorMessage(caught: unknown, fallback: string): string {
  if (caught instanceof AdminApiError) {
    return caught.message
  }
  return fallback
}

type NodeSelection = { mode: 'new' } | { mode: 'edit'; key: string } | null
type RelationSelection = { mode: 'new' } | { mode: 'edit'; key: string } | null

/** Atlas taxonomy page (Plan B Task 13).
 *
 * Node-type and relation-type CRUD over the accepted backend contract.
 * Keys are immutable (the forms lock them with the reason inline);
 * lifecycle is active/retired; an in-use row cannot be deleted or
 * retired — the server answers `409 TAXONOMY_IN_USE` and the form
 * surfaces it instead of mutating.
 */
export function AtlasTaxonomyPage() {
  const queryClient = useQueryClient()
  const [nodeSelection, setNodeSelection] = useState<NodeSelection>(null)
  const [relationSelection, setRelationSelection] =
    useState<RelationSelection>(null)

  const taxonomyQuery = useQuery({
    queryKey: ATLAS_TAXONOMY_QUERY_KEY,
    queryFn: listTaxonomy,
  })

  function refreshAfterMutation() {
    void queryClient.invalidateQueries({
      queryKey: ATLAS_TAXONOMY_QUERY_KEY,
    })
  }

  const nodeTypes = taxonomyQuery.data?.nodeTypes ?? []
  const relationTypes = taxonomyQuery.data?.relationTypes ?? []
  const editingNode: AtlasNodeTypeRow | null =
    nodeSelection?.mode === 'edit'
      ? (nodeTypes.find((row) => row.key === nodeSelection.key) ?? null)
      : null
  const editingRelation: AtlasRelationTypeRow | null =
    relationSelection?.mode === 'edit'
      ? (relationTypes.find((row) => row.key === relationSelection.key) ?? null)
      : null

  return (
    <main className="page">
      <h1>Atlas taxonomy</h1>
      {taxonomyQuery.isPending ? (
        <p role="status">Loading Atlas taxonomy…</p>
      ) : null}
      {taxonomyQuery.error ? (
        <Notice tone="error" title="Failed to load the Atlas taxonomy">
          {toErrorMessage(
            taxonomyQuery.error,
            'Failed to load the Atlas taxonomy.',
          )}
        </Notice>
      ) : null}
      {!taxonomyQuery.isPending && !taxonomyQuery.error ? (
        <>
          <section aria-labelledby="atlas-node-types-heading">
            <h2 id="atlas-node-types-heading">Node types</h2>
            <Table<AtlasNodeTypeRow>
              caption="Node types"
              columns={[
                { key: 'key', header: 'Key' },
                { key: 'label_en', header: 'English label' },
                { key: 'label_fa', header: 'Persian label' },
                {
                  key: 'active',
                  header: 'Status',
                  render: (row) => (row.active ? 'Active' : 'Retired'),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (row) => (
                    <button
                      type="button"
                      className="admin-button admin-button--secondary"
                      onClick={() =>
                        setNodeSelection({ mode: 'edit', key: row.key })
                      }
                    >
                      Edit
                    </button>
                  ),
                },
              ]}
              rows={nodeTypes}
              rowKey={(row) => row.key}
              emptyMessage="No node types yet."
            />
            <button
              type="button"
              className="admin-button"
              onClick={() => setNodeSelection({ mode: 'new' })}
            >
              New node type
            </button>
            {nodeSelection !== null ? (
              <NodeTypeForm
                key={
                  nodeSelection.mode === 'new'
                    ? 'new-node-type'
                    : `edit-node-type-${nodeSelection.key}`
                }
                row={nodeSelection.mode === 'new' ? null : editingNode}
                onSaved={() => {
                  setNodeSelection(null)
                  refreshAfterMutation()
                }}
                onDeleted={() => {
                  setNodeSelection(null)
                  refreshAfterMutation()
                }}
              />
            ) : null}
          </section>

          <section aria-labelledby="atlas-relation-types-heading">
            <h2 id="atlas-relation-types-heading">Relation types</h2>
            <Table<AtlasRelationTypeRow>
              caption="Relation types"
              columns={[
                { key: 'key', header: 'Key' },
                { key: 'label_en', header: 'English label' },
                { key: 'label_fa', header: 'Persian label' },
                {
                  key: 'hierarchyRole',
                  header: 'Hierarchy',
                  render: (row) => (row.hierarchyRole ? 'Hierarchy' : '—'),
                },
                {
                  key: 'active',
                  header: 'Status',
                  render: (row) => (row.active ? 'Active' : 'Retired'),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (row) => (
                    <button
                      type="button"
                      className="admin-button admin-button--secondary"
                      onClick={() =>
                        setRelationSelection({ mode: 'edit', key: row.key })
                      }
                    >
                      Edit
                    </button>
                  ),
                },
              ]}
              rows={relationTypes}
              rowKey={(row) => row.key}
              emptyMessage="No relation types yet."
            />
            <button
              type="button"
              className="admin-button"
              onClick={() => setRelationSelection({ mode: 'new' })}
            >
              New relation type
            </button>
            {relationSelection !== null ? (
              <RelationTypeForm
                key={
                  relationSelection.mode === 'new'
                    ? 'new-relation-type'
                    : `edit-relation-type-${relationSelection.key}`
                }
                row={relationSelection.mode === 'new' ? null : editingRelation}
                nodeTypes={nodeTypes}
                onSaved={() => {
                  setRelationSelection(null)
                  refreshAfterMutation()
                }}
                onDeleted={() => {
                  setRelationSelection(null)
                  refreshAfterMutation()
                }}
              />
            ) : null}
          </section>
        </>
      ) : null}
    </main>
  )
}
