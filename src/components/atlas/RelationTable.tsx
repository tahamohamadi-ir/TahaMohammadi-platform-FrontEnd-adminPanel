import { useState } from 'react'

import { SelectField, Table } from '@/components/ui/primitives'
import type {
  AtlasNodeRow,
  AtlasNodeTypeRow,
  AtlasRelationRow,
  AtlasRelationTypeRow,
} from '@/lib/api/atlas'

export interface RelationTableProps {
  relations: AtlasRelationRow[]
  nodes: AtlasNodeRow[]
  nodeTypes?: AtlasNodeTypeRow[]
  relationTypes: AtlasRelationTypeRow[]
  onEdit: (key: string) => void
  onDelete: (key: string) => void
  onInspect: (key: string) => void
}

function endpointType(nodes: AtlasNodeRow[], publicKey: string): string {
  return nodes.find((n) => n.publicKey === publicKey)?.nodeTypeKey ?? ''
}

function isHierarchy(
  relationTypes: AtlasRelationTypeRow[],
  relationTypeKey: string,
): boolean {
  return (
    relationTypes.find((t) => t.key === relationTypeKey)?.hierarchyRole === true
  )
}

/** Filterable relation table (Plan B Task 12).
 *
 * Filters derive from served data only: the relation-type row carries
 * `hierarchyRole`, and endpoint types resolve through the loaded nodes.
 * Delete is always a two-step confirm; the table never mutates by itself.
 */
export function RelationTable({
  relations,
  nodes,
  relationTypes,
  onEdit,
  onDelete,
  onInspect,
}: RelationTableProps) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [sourceTypeFilter, setSourceTypeFilter] = useState('all')
  const [targetTypeFilter, setTargetTypeFilter] = useState('all')
  const [hierarchyOnly, setHierarchyOnly] = useState(false)
  const [hiddenOnly, setHiddenOnly] = useState(false)
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null)

  const nodeTypeKeys = Array.from(
    new Set(nodes.map((n) => n.nodeTypeKey)),
  ).sort()

  const visible = relations.filter((row) => {
    if (typeFilter !== 'all' && row.relationTypeKey !== typeFilter) {
      return false
    }
    if (
      sourceTypeFilter !== 'all' &&
      endpointType(nodes, row.sourceKey) !== sourceTypeFilter
    ) {
      return false
    }
    if (
      targetTypeFilter !== 'all' &&
      endpointType(nodes, row.targetKey) !== targetTypeFilter
    ) {
      return false
    }
    if (hierarchyOnly && !isHierarchy(relationTypes, row.relationTypeKey)) {
      return false
    }
    if (hiddenOnly && row.visible) {
      return false
    }
    return true
  })

  return (
    <div>
      <div>
        <SelectField
          id="relation-table-type"
          label="Relation type"
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: 'all', label: 'All types' },
            ...relationTypes.map((t) => ({ value: t.key, label: t.key })),
          ]}
        />
        <SelectField
          id="relation-table-source-type"
          label="Source type"
          value={sourceTypeFilter}
          onChange={setSourceTypeFilter}
          options={[
            { value: 'all', label: 'All source types' },
            ...nodeTypeKeys.map((key) => ({ value: key, label: key })),
          ]}
        />
        <SelectField
          id="relation-table-target-type"
          label="Target type"
          value={targetTypeFilter}
          onChange={setTargetTypeFilter}
          options={[
            { value: 'all', label: 'All target types' },
            ...nodeTypeKeys.map((key) => ({ value: key, label: key })),
          ]}
        />
        <div className="admin-field admin-field--check">
          <input
            className="admin-check"
            type="checkbox"
            id="relation-table-hierarchy"
            checked={hierarchyOnly}
            onChange={(event) => setHierarchyOnly(event.currentTarget.checked)}
          />
          <label
            className="admin-field__label"
            htmlFor="relation-table-hierarchy"
          >
            Hierarchy only
          </label>
        </div>
        <div className="admin-field admin-field--check">
          <input
            className="admin-check"
            type="checkbox"
            id="relation-table-hidden"
            checked={hiddenOnly}
            onChange={(event) => setHiddenOnly(event.currentTarget.checked)}
          />
          <label className="admin-field__label" htmlFor="relation-table-hidden">
            Hidden only
          </label>
        </div>
      </div>

      <Table<AtlasRelationRow>
        caption="Atlas relations"
        rows={visible}
        rowKey={(row) => row.key}
        emptyMessage="No relations match the filters."
        columns={[
          { key: 'key', header: 'Key', render: (row) => row.key },
          { key: 'source', header: 'Source', render: (row) => row.sourceKey },
          {
            key: 'type',
            header: 'Type',
            render: (row) => row.relationTypeKey,
          },
          { key: 'target', header: 'Target', render: (row) => row.targetKey },
          {
            key: 'weight',
            header: 'Weight',
            render: (row) => String(row.weight),
          },
          {
            key: 'visible',
            header: 'Visible',
            render: (row) => (row.visible ? 'yes' : 'no'),
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (row) => (
              <>
                <button
                  type="button"
                  className="admin-button admin-button--secondary"
                  onClick={() => onEdit(row.key)}
                >
                  Edit
                </button>
                {confirmingKey === row.key ? (
                  <>
                    <button
                      type="button"
                      className="admin-button"
                      onClick={() => {
                        setConfirmingKey(null)
                        onDelete(row.key)
                      }}
                    >
                      Confirm delete
                    </button>
                    <button
                      type="button"
                      className="admin-button admin-button--secondary"
                      onClick={() => setConfirmingKey(null)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="admin-button admin-button--secondary"
                    onClick={() => setConfirmingKey(row.key)}
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  className="admin-button admin-button--secondary"
                  onClick={() => onInspect(row.key)}
                >
                  Inspect
                </button>
              </>
            ),
          },
        ]}
      />
    </div>
  )
}
