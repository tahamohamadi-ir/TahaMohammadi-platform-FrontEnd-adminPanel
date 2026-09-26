import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import {
  Notice,
  TextField,
  ValidationSummary,
} from '@/components/ui/primitives'
import {
  deleteNodeType,
  deleteRelationType,
  saveNodeType,
  saveRelationType,
  updateNodeType,
  updateRelationType,
  type AtlasNodeTypeRow,
  type AtlasRelationTypeRow,
} from '@/lib/api/atlas'
import { AdminApiError } from '@/lib/api/auth'

export interface NodeTypeFormProps {
  row: AtlasNodeTypeRow | null
  /** Known in-use (a prior 409 or owner knowledge): key stays locked and
   * delete is disabled with the reason stated inline. */
  inUse?: boolean
  onSaved: (row: AtlasNodeTypeRow) => void
  onDeleted?: (key: string) => void
}

function fieldIssue(
  prefix: string,
  field: string,
  message: string,
): { field: string; message: string; targetId: string } {
  return { field, message, targetId: `${prefix}-${field}` }
}

/** Node-type authoring form (Plan B Task 13).
 *
 * The served row is the whole contract: `key` is identity and is never an
 * editable control (disabled with the reason inline); `canonicalSource`
 * and `defaultImportance` are served read-only; labels, `active` and
 * `sort_order` are the only PATCH fields. Delete is two-step and an
 * in-use row answers `409 TAXONOMY_IN_USE` instead of disappearing.
 */
export function NodeTypeForm({
  row,
  inUse = false,
  onSaved,
  onDeleted,
}: NodeTypeFormProps) {
  const isNew = row === null
  const [key, setKey] = useState('')
  const [labelEn, setLabelEn] = useState(row?.label_en ?? '')
  const [labelFa, setLabelFa] = useState(row?.label_fa ?? '')
  const [active, setActive] = useState(row?.active ?? true)
  const [sortOrder, setSortOrder] = useState(row ? String(row.sort_order) : '')
  const [clientError, setClientError] = useState<string | null>(null)
  const [fieldIssues, setFieldIssues] = useState<
    { field: string; message: string; targetId: string }[]
  >([])
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [knownInUse, setKnownInUse] = useState(inUse)

  const saveMutation = useMutation({
    mutationFn: () => {
      const trimmedSort = sortOrder.trim()
      const patch = {
        label_en: labelEn.trim(),
        label_fa: labelFa.trim(),
        active,
        ...(trimmedSort !== '' ? { sort_order: Number(trimmedSort) } : {}),
      }
      if (isNew) {
        return saveNodeType({ key: key.trim(), ...patch })
      }
      if (row === null) {
        return Promise.reject(new Error('No node type selected.'))
      }
      return updateNodeType(row.key, patch)
    },
    onSuccess: (saved) => {
      setClientError(null)
      setFieldIssues([])
      setSaveError(null)
      onSaved(saved)
    },
    onError: (caught) => {
      if (caught instanceof AdminApiError) {
        setFieldIssues(
          Object.entries(caught.fieldErrors ?? {}).map(([field, message]) =>
            fieldIssue('nodetype', field, message),
          ),
        )
        if (caught.code === 'TAXONOMY_IN_USE') {
          setKnownInUse(true)
        }
        setSaveError(
          caught.code === 'TAXONOMY_IN_USE'
            ? `Taxonomy conflict (TAXONOMY_IN_USE): ${caught.message}`
            : caught.message,
        )
      } else {
        setFieldIssues([])
        setSaveError('Failed to save the node type.')
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (row === null) {
        return Promise.resolve()
      }
      return deleteNodeType(row.key)
    },
    onSuccess: () => {
      setDeleteError(null)
      setConfirmingDelete(false)
      if (row !== null) {
        onDeleted?.(row.key)
      }
    },
    onError: (caught) => {
      if (
        caught instanceof AdminApiError &&
        caught.code === 'TAXONOMY_IN_USE'
      ) {
        setKnownInUse(true)
        setDeleteError(`Taxonomy conflict (TAXONOMY_IN_USE): ${caught.message}`)
      } else {
        setDeleteError(
          caught instanceof AdminApiError
            ? caught.message
            : 'Failed to delete the node type.',
        )
      }
    },
  })

  function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setClientError(null)
    setFieldIssues([])
    setSaveError(null)
    if (isNew && key.trim().length < 2) {
      setClientError('Key must be at least 2 characters.')
      return
    }
    if (labelEn.trim() === '' || labelFa.trim() === '') {
      setClientError('English and Persian labels are required.')
      return
    }
    if (
      sortOrder.trim() !== '' &&
      (!Number.isInteger(Number(sortOrder)) || Number(sortOrder) < 0)
    ) {
      setClientError('Sort order must be a whole number of 0 or more.')
      return
    }
    saveMutation.mutate()
  }

  return (
    <form
      aria-label={isNew ? 'Create node type' : 'Edit node type'}
      onSubmit={handleSave}
    >
      {!isNew && row !== null ? (
        <p>
          Type key: <span>{row.key}</span>
          {row.active ? null : <span> Retired</span>}
        </p>
      ) : null}
      {isNew ? (
        <TextField
          id="nodetype-key"
          label="Key"
          value={key}
          onChange={setKey}
          description="Stable public key. Immutable once created — delete and recreate to rename."
        />
      ) : (
        <TextField
          id="nodetype-key"
          label="Key"
          value={row?.key ?? ''}
          disabled
          description={
            knownInUse
              ? 'Key is immutable. This type is in use by existing rows, so the key cannot change.'
              : 'Key is immutable once created and cannot be edited.'
          }
        />
      )}
      <TextField
        id="nodetype-label-en"
        label="English label"
        value={labelEn}
        onChange={setLabelEn}
      />
      <TextField
        id="nodetype-label-fa"
        label="Persian label"
        value={labelFa}
        onChange={setLabelFa}
      />
      <TextField
        id="nodetype-sort-order"
        label="Sort order"
        type="number"
        value={sortOrder}
        onChange={setSortOrder}
      />
      <div className="admin-field admin-field--check">
        <input
          className="admin-check"
          type="checkbox"
          id="nodetype-active"
          checked={active}
          onChange={(event) => setActive(event.currentTarget.checked)}
        />
        <label className="admin-field__label" htmlFor="nodetype-active">
          Active
        </label>
        <p
          className="admin-field__description"
          id="nodetype-active-description"
        >
          Retiring sets active off. A type in use cannot be retired.
        </p>
      </div>
      {!isNew && row !== null ? (
        <p>
          Canonical source: {row.canonicalSource} · Default importance:{' '}
          {row.defaultImportance}
        </p>
      ) : null}
      {clientError ? (
        <Notice tone="error" title="Cannot save the node type">
          {clientError}
        </Notice>
      ) : null}
      <ValidationSummary
        title="Cannot save the node type"
        errors={fieldIssues}
      />
      {saveError ? (
        <Notice tone="error" title="Failed to save the node type">
          {saveError}
        </Notice>
      ) : null}
      <button
        type="submit"
        className="admin-button"
        disabled={saveMutation.isPending}
      >
        {isNew ? 'Create node type' : 'Save node type'}
      </button>
      {!isNew ? (
        <>
          <button
            type="button"
            className="admin-button admin-button--danger"
            disabled={knownInUse || deleteMutation.isPending}
            title={
              knownInUse
                ? 'This type is in use — it cannot be deleted.'
                : undefined
            }
            onClick={() => setConfirmingDelete(true)}
          >
            Delete node type
          </button>
          {knownInUse ? (
            <p>This type is in use — it cannot be deleted.</p>
          ) : null}
          {confirmingDelete && !knownInUse ? (
            <>
              <p>Delete this node type? This cannot be undone.</p>
              <button
                type="button"
                className="admin-button admin-button--danger"
                onClick={() => deleteMutation.mutate()}
              >
                Confirm delete
              </button>
              <button
                type="button"
                className="admin-button admin-button--secondary"
                onClick={() => setConfirmingDelete(false)}
              >
                Cancel
              </button>
            </>
          ) : null}
          {deleteError ? (
            <Notice tone="error" title="Failed to delete the node type">
              {deleteError}
            </Notice>
          ) : null}
        </>
      ) : null}
    </form>
  )
}

export interface RelationTypeFormProps {
  row: AtlasRelationTypeRow | null
  nodeTypes?: AtlasNodeTypeRow[]
  inUse?: boolean
  onSaved: (row: AtlasRelationTypeRow) => void
  onDeleted?: (key: string) => void
}

/** Relation-type authoring form (Plan B Task 13).
 *
 * Creation-time metadata only exists on create: the backend PATCH accepts
 * labels/active/sort alone, so direction defaults and the allowed-pair
 * lists render read-only on edit (an editable control there would be a
 * silent no-op). `hierarchyRole` is served read-only everywhere — the
 * admin API never writes it.
 */
export function RelationTypeForm({
  row,
  nodeTypes = [],
  inUse = false,
  onSaved,
  onDeleted,
}: RelationTypeFormProps) {
  const isNew = row === null
  const [key, setKey] = useState('')
  const [labelEn, setLabelEn] = useState(row?.label_en ?? '')
  const [labelFa, setLabelFa] = useState(row?.label_fa ?? '')
  const [directedDefault, setDirectedDefault] = useState(
    row?.directedDefault ?? true,
  )
  const [overridableDirection, setOverridableDirection] = useState(
    row?.overridableDirection ?? true,
  )
  const [active, setActive] = useState(row?.active ?? true)
  const [sortOrder, setSortOrder] = useState(row ? String(row.sort_order) : '')
  const [allowedSource, setAllowedSource] = useState<string[]>(
    row?.allowedSourceTypes ?? [],
  )
  const [allowedTarget, setAllowedTarget] = useState<string[]>(
    row?.allowedTargetTypes ?? [],
  )
  const [clientError, setClientError] = useState<string | null>(null)
  const [fieldIssues, setFieldIssues] = useState<
    { field: string; message: string; targetId: string }[]
  >([])
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [knownInUse, setKnownInUse] = useState(inUse)

  const activeNodeTypes = nodeTypes.filter((t) => t.active)

  function toggle(list: string[], value: string): string[] {
    return list.includes(value)
      ? list.filter((entry) => entry !== value)
      : [...list, value]
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const trimmedSort = sortOrder.trim()
      const patch = {
        label_en: labelEn.trim(),
        label_fa: labelFa.trim(),
        active,
        ...(trimmedSort !== '' ? { sort_order: Number(trimmedSort) } : {}),
      }
      if (isNew) {
        return saveRelationType({
          key: key.trim(),
          ...patch,
          directedDefault,
          overridableDirection,
          ...(allowedSource.length > 0
            ? { allowedSourceTypes: allowedSource }
            : {}),
          ...(allowedTarget.length > 0
            ? { allowedTargetTypes: allowedTarget }
            : {}),
        })
      }
      if (row === null) {
        return Promise.reject(new Error('No relation type selected.'))
      }
      return updateRelationType(row.key, patch)
    },
    onSuccess: (saved) => {
      setClientError(null)
      setFieldIssues([])
      setSaveError(null)
      onSaved(saved)
    },
    onError: (caught) => {
      if (caught instanceof AdminApiError) {
        setFieldIssues(
          Object.entries(caught.fieldErrors ?? {}).map(([field, message]) =>
            fieldIssue('relationtype', field, message),
          ),
        )
        if (caught.code === 'TAXONOMY_IN_USE') {
          setKnownInUse(true)
        }
        setSaveError(
          caught.code === 'TAXONOMY_IN_USE'
            ? `Taxonomy conflict (TAXONOMY_IN_USE): ${caught.message}`
            : caught.message,
        )
      } else {
        setFieldIssues([])
        setSaveError('Failed to save the relation type.')
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (row === null) {
        return Promise.resolve()
      }
      return deleteRelationType(row.key)
    },
    onSuccess: () => {
      setDeleteError(null)
      setConfirmingDelete(false)
      if (row !== null) {
        onDeleted?.(row.key)
      }
    },
    onError: (caught) => {
      if (
        caught instanceof AdminApiError &&
        caught.code === 'TAXONOMY_IN_USE'
      ) {
        setKnownInUse(true)
        setDeleteError(`Taxonomy conflict (TAXONOMY_IN_USE): ${caught.message}`)
      } else {
        setDeleteError(
          caught instanceof AdminApiError
            ? caught.message
            : 'Failed to delete the relation type.',
        )
      }
    },
  })

  function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setClientError(null)
    setFieldIssues([])
    setSaveError(null)
    if (isNew && key.trim().length < 2) {
      setClientError('Key must be at least 2 characters.')
      return
    }
    if (labelEn.trim() === '' || labelFa.trim() === '') {
      setClientError('English and Persian labels are required.')
      return
    }
    if (
      sortOrder.trim() !== '' &&
      (!Number.isInteger(Number(sortOrder)) || Number(sortOrder) < 0)
    ) {
      setClientError('Sort order must be a whole number of 0 or more.')
      return
    }
    saveMutation.mutate()
  }

  return (
    <form
      aria-label={isNew ? 'Create relation type' : 'Edit relation type'}
      onSubmit={handleSave}
    >
      {!isNew && row !== null ? (
        <p>
          Type key: <span>{row.key}</span>
          {row.active ? null : <span> Retired</span>}
          {row.hierarchyRole ? <span> Hierarchy relation</span> : null}
        </p>
      ) : null}
      {isNew ? (
        <TextField
          id="relationtype-key"
          label="Key"
          value={key}
          onChange={setKey}
          description="Stable public key. Immutable once created — delete and recreate to rename."
        />
      ) : (
        <TextField
          id="relationtype-key"
          label="Key"
          value={row?.key ?? ''}
          disabled
          description={
            knownInUse
              ? 'Key is immutable. This type is in use by existing rows, so the key cannot change.'
              : 'Key is immutable once created and cannot be edited.'
          }
        />
      )}
      <TextField
        id="relationtype-label-en"
        label="English label"
        value={labelEn}
        onChange={setLabelEn}
      />
      <TextField
        id="relationtype-label-fa"
        label="Persian label"
        value={labelFa}
        onChange={setLabelFa}
      />
      <TextField
        id="relationtype-sort-order"
        label="Sort order"
        type="number"
        value={sortOrder}
        onChange={setSortOrder}
      />
      <div className="admin-field admin-field--check">
        <input
          className="admin-check"
          type="checkbox"
          id="relationtype-active"
          checked={active}
          onChange={(event) => setActive(event.currentTarget.checked)}
        />
        <label className="admin-field__label" htmlFor="relationtype-active">
          Active
        </label>
        <p
          className="admin-field__description"
          id="relationtype-active-description"
        >
          Retiring sets active off. A type in use cannot be retired.
        </p>
      </div>
      {isNew ? (
        <>
          <div className="admin-field admin-field--check">
            <input
              className="admin-check"
              type="checkbox"
              id="relationtype-directed-default"
              checked={directedDefault}
              onChange={(event) =>
                setDirectedDefault(event.currentTarget.checked)
              }
            />
            <label
              className="admin-field__label"
              htmlFor="relationtype-directed-default"
            >
              Directed by default
            </label>
          </div>
          <div className="admin-field admin-field--check">
            <input
              className="admin-check"
              type="checkbox"
              id="relationtype-overridable"
              checked={overridableDirection}
              onChange={(event) =>
                setOverridableDirection(event.currentTarget.checked)
              }
            />
            <label
              className="admin-field__label"
              htmlFor="relationtype-overridable"
            >
              Overridable direction
            </label>
          </div>
          {!overridableDirection ? (
            <p>Relations of this type always use the default direction.</p>
          ) : null}
          <fieldset>
            <legend>Allowed source types</legend>
            <p>Empty means any active type.</p>
            {activeNodeTypes.map((type) => (
              <div
                className="admin-field admin-field--check"
                key={`source-${type.key}`}
              >
                <input
                  className="admin-check"
                  type="checkbox"
                  id={`relationtype-source-${type.key}`}
                  checked={allowedSource.includes(type.key)}
                  onChange={() =>
                    setAllowedSource(toggle(allowedSource, type.key))
                  }
                />
                <label
                  className="admin-field__label"
                  htmlFor={`relationtype-source-${type.key}`}
                >
                  {type.key}
                </label>
              </div>
            ))}
          </fieldset>
          <fieldset>
            <legend>Allowed target types</legend>
            <p>Empty means any active type.</p>
            {activeNodeTypes.map((type) => (
              <div
                className="admin-field admin-field--check"
                key={`target-${type.key}`}
              >
                <input
                  className="admin-check"
                  type="checkbox"
                  id={`relationtype-target-${type.key}`}
                  checked={allowedTarget.includes(type.key)}
                  onChange={() =>
                    setAllowedTarget(toggle(allowedTarget, type.key))
                  }
                />
                <label
                  className="admin-field__label"
                  htmlFor={`relationtype-target-${type.key}`}
                >
                  {type.key}
                </label>
              </div>
            ))}
          </fieldset>
          <p>
            The hierarchy role is read from the served row; this API does not
            change it.
          </p>
        </>
      ) : (
        row !== null && (
          <p>
            Directed by default: {row.directedDefault ? 'yes' : 'no'} ·
            Overridable direction: {row.overridableDirection ? 'yes' : 'no'} ·
            Hierarchy relation: {row.hierarchyRole ? 'yes' : 'no'} · Allowed
            sources:{' '}
            {row.allowedSourceTypes.length > 0
              ? row.allowedSourceTypes.join(', ')
              : 'any active type'}{' '}
            · Allowed targets:{' '}
            {row.allowedTargetTypes.length > 0
              ? row.allowedTargetTypes.join(', ')
              : 'any active type'}
            . Direction and allowed types are set at creation.
          </p>
        )
      )}
      {clientError ? (
        <Notice tone="error" title="Cannot save the relation type">
          {clientError}
        </Notice>
      ) : null}
      <ValidationSummary
        title="Cannot save the relation type"
        errors={fieldIssues}
      />
      {saveError ? (
        <Notice tone="error" title="Failed to save the relation type">
          {saveError}
        </Notice>
      ) : null}
      <button
        type="submit"
        className="admin-button"
        disabled={saveMutation.isPending}
      >
        {isNew ? 'Create relation type' : 'Save relation type'}
      </button>
      {!isNew ? (
        <>
          <button
            type="button"
            className="admin-button admin-button--danger"
            disabled={knownInUse || deleteMutation.isPending}
            title={
              knownInUse
                ? 'This type is in use — it cannot be deleted.'
                : undefined
            }
            onClick={() => setConfirmingDelete(true)}
          >
            Delete relation type
          </button>
          {knownInUse ? (
            <p>This type is in use — it cannot be deleted.</p>
          ) : null}
          {confirmingDelete && !knownInUse ? (
            <>
              <p>Delete this relation type? This cannot be undone.</p>
              <button
                type="button"
                className="admin-button admin-button--danger"
                onClick={() => deleteMutation.mutate()}
              >
                Confirm delete
              </button>
              <button
                type="button"
                className="admin-button admin-button--secondary"
                onClick={() => setConfirmingDelete(false)}
              >
                Cancel
              </button>
            </>
          ) : null}
          {deleteError ? (
            <Notice tone="error" title="Failed to delete the relation type">
              {deleteError}
            </Notice>
          ) : null}
        </>
      ) : null}
    </form>
  )
}
