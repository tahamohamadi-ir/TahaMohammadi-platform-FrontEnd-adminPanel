import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import {
  Notice,
  SelectField,
  TextField,
  ValidationSummary,
} from '@/components/ui/primitives'
import {
  createAtlasRelation,
  deleteAtlasRelation,
  updateAtlasRelation,
  type AtlasNodeRow,
  type AtlasNodeTypeRow,
  type AtlasRelationPatchBody,
  type AtlasRelationRow,
  type AtlasRelationTypeRow,
  type AtlasRelationWriteBody,
} from '@/lib/api/atlas'
import { AdminApiError } from '@/lib/api/auth'

export interface RelationFormProps {
  versionId: number
  revision: string
  relation: AtlasRelationRow | null
  nodes: AtlasNodeRow[]
  nodeTypes?: AtlasNodeTypeRow[]
  relationTypes: AtlasRelationTypeRow[]
  onSaved: (row: AtlasRelationRow) => void
  onDeleted?: (key: string) => void
}

function nodeLabel(node: AtlasNodeRow, nodeTypes: AtlasNodeTypeRow[]): string {
  const type = nodeTypes.find((t) => t.key === node.nodeTypeKey)
  return type ? `${node.publicKey} (${type.key})` : node.publicKey
}

/** Structured relation form (Plan B Task 12).
 *
 * The composed key is identity and renders read-only in edit mode.
 * Endpoint filtering mirrors the backend pair rule (spec §6.2): a non-empty
 * allowed list restricts the picker, an empty list means any active type.
 * `AdminApiError` carries no `issues[]`, so the pair-blocked envelope is
 * keyed on its `VALIDATION_BLOCKED` code and rendered inline on Target.
 */
export function RelationForm({
  versionId,
  revision,
  relation,
  nodes,
  nodeTypes = [],
  relationTypes,
  onSaved,
  onDeleted,
}: RelationFormProps) {
  const isNew = relation === null
  const [sourceKey, setSourceKey] = useState(relation?.sourceKey ?? '')
  const [relationTypeKey, setRelationTypeKey] = useState(
    relation?.relationTypeKey ?? '',
  )
  const [targetKey, setTargetKey] = useState(relation?.targetKey ?? '')
  const selectedType = relationTypes.find((t) => t.key === relationTypeKey)
  const [directed, setDirected] = useState(
    relation?.directed ?? selectedType?.directedDefault ?? true,
  )
  const [weight, setWeight] = useState(relation ? String(relation.weight) : '')
  const [visible, setVisible] = useState(relation?.visible ?? true)
  const [explanationEn, setExplanationEn] = useState('')
  const [explanationFa, setExplanationFa] = useState('')
  const [clientError, setClientError] = useState<string | null>(null)
  const [targetPairError, setTargetPairError] = useState<string | null>(null)
  const [fieldIssues, setFieldIssues] = useState<
    { field: string; message: string; targetId: string }[]
  >([])
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const showDirected = selectedType?.overridableDirection ?? false

  function pickType(key: string) {
    setRelationTypeKey(key)
    const next = relationTypes.find((t) => t.key === key)
    if (next && !next.overridableDirection) {
      setDirected(next.directedDefault)
    }
  }

  const sourceOptions = nodes.filter((n) => {
    if (
      selectedType &&
      selectedType.allowedSourceTypes.length > 0 &&
      !selectedType.allowedSourceTypes.includes(n.nodeTypeKey)
    ) {
      return false
    }
    return true
  })
  const targetOptions = nodes.filter((n) => {
    if (n.publicKey === sourceKey) {
      return false
    }
    if (
      selectedType &&
      selectedType.allowedTargetTypes.length > 0 &&
      !selectedType.allowedTargetTypes.includes(n.nodeTypeKey)
    ) {
      return false
    }
    return true
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      const explanation: Record<string, string> = {}
      if (explanationEn.trim() !== '') {
        explanation['en'] = explanationEn.trim()
      }
      if (explanationFa.trim() !== '') {
        explanation['fa'] = explanationFa.trim()
      }
      if (isNew || relation === null) {
        const body: AtlasRelationWriteBody = {
          sourceKey,
          relationTypeKey,
          targetKey,
          directed,
          visible,
          ...(weight.trim() !== '' ? { weight: Number(weight) } : {}),
          ...(Object.keys(explanation).length > 0 ? { explanation } : {}),
        }
        return createAtlasRelation(versionId, body, revision)
      }
      const patch: AtlasRelationPatchBody = {
        directed,
        visible,
        ...(weight.trim() !== '' ? { weight: Number(weight) } : {}),
        ...(Object.keys(explanation).length > 0 ? { explanation } : {}),
      }
      return updateAtlasRelation(versionId, relation.key, patch, revision)
    },
    onSuccess: (row) => {
      setClientError(null)
      setTargetPairError(null)
      setFieldIssues([])
      setSaveError(null)
      onSaved(row)
    },
    onError: (caught) => {
      if (caught instanceof AdminApiError) {
        setFieldIssues(
          Object.entries(caught.fieldErrors ?? {}).map(([field, message]) => ({
            field,
            message,
            targetId: `relation-${field}`,
          })),
        )
        if (caught.code === 'VALIDATION_BLOCKED') {
          setTargetPairError(
            'This relation type is not allowed for this pair — pick a target whose type the relation type allows.',
          )
          setSaveError(null)
        } else if (caught.code === 'STALE_REVISION') {
          setTargetPairError(null)
          setSaveError(
            'The version changed on the server since you loaded it. Reload the editor and retry.',
          )
        } else {
          setTargetPairError(null)
          setSaveError(caught.message)
        }
      } else {
        setFieldIssues([])
        setTargetPairError(null)
        setSaveError('Failed to save the relation.')
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (relation === null) {
        return Promise.resolve()
      }
      return deleteAtlasRelation(versionId, relation.key, revision)
    },
    onSuccess: () => {
      setDeleteError(null)
      setConfirmingDelete(false)
      if (relation !== null) {
        onDeleted?.(relation.key)
      }
    },
    onError: (caught) => {
      setDeleteError(
        caught instanceof AdminApiError
          ? caught.message
          : 'Failed to delete the relation.',
      )
    },
  })

  function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setClientError(null)
    setTargetPairError(null)
    setFieldIssues([])
    setSaveError(null)
    if (sourceKey === '' || relationTypeKey === '' || targetKey === '') {
      setClientError('Source, relation type and target are all required.')
      return
    }
    if (weight.trim() !== '' && !Number.isFinite(Number(weight))) {
      setClientError('Weight must be a number.')
      return
    }
    saveMutation.mutate()
  }

  return (
    <form
      id="relation-form"
      aria-label={isNew ? 'Create relation' : 'Edit relation'}
      onSubmit={handleSave}
    >
      {relation !== null ? (
        <p>
          Relation key: <span>{relation.key}</span>
        </p>
      ) : null}

      <SelectField
        id="relation-source"
        label="Source"
        value={sourceKey}
        onChange={setSourceKey}
        options={[
          { value: '', label: 'Select a source node' },
          ...sourceOptions.map((n) => ({
            value: n.publicKey,
            label: nodeLabel(n, nodeTypes),
          })),
        ]}
      />

      <SelectField
        id="relation-type"
        label="Relation Type"
        value={relationTypeKey}
        onChange={pickType}
        options={[
          { value: '', label: 'Select a relation type' },
          ...relationTypes
            .filter((t) => t.active)
            .map((t) => ({ value: t.key, label: t.key })),
        ]}
      />

      <SelectField
        id="relation-target"
        label="Target"
        value={targetKey}
        onChange={setTargetKey}
        description={
          selectedType && selectedType.allowedTargetTypes.length > 0
            ? `Limited to: ${selectedType.allowedTargetTypes.join(', ')}.`
            : 'Any node type is allowed for this relation type.'
        }
        options={[
          { value: '', label: 'Select a target node' },
          ...targetOptions.map((n) => ({
            value: n.publicKey,
            label: nodeLabel(n, nodeTypes),
          })),
        ]}
      />
      {targetPairError ? (
        <p role="alert" className="admin-field__error">
          {targetPairError}
        </p>
      ) : null}

      {showDirected ? (
        <div className="admin-field admin-field--check">
          <input
            className="admin-check"
            type="checkbox"
            id="relation-directed"
            checked={directed}
            onChange={(event) => setDirected(event.currentTarget.checked)}
          />
          <label className="admin-field__label" htmlFor="relation-directed">
            Directed
          </label>
        </div>
      ) : null}

      <TextField
        id="relation-weight"
        label="Weight"
        type="number"
        value={weight}
        onChange={setWeight}
        description="Blank keeps the type default weight."
      />

      <TextField
        id="relation-explanation-en"
        label="English explanation"
        value={explanationEn}
        onChange={setExplanationEn}
        description="Blank = no English explanation stored."
      />
      <TextField
        id="relation-explanation-fa"
        label="Persian explanation"
        value={explanationFa}
        onChange={setExplanationFa}
        description="Blank = no Persian explanation stored."
      />

      <div className="admin-field admin-field--check">
        <input
          className="admin-check"
          type="checkbox"
          id="relation-visible"
          checked={visible}
          onChange={(event) => setVisible(event.currentTarget.checked)}
        />
        <label className="admin-field__label" htmlFor="relation-visible">
          Visible
        </label>
      </div>

      {clientError ? (
        <p role="alert" className="admin-field__error">
          {clientError}
        </p>
      ) : null}
      <ValidationSummary
        title="Relation payload invalid"
        errors={fieldIssues}
      />
      {saveError ? (
        <Notice tone="error" title="Failed to save the relation">
          {saveError}
        </Notice>
      ) : null}

      <button
        type="submit"
        className="admin-button"
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending
          ? 'Saving…'
          : isNew
            ? 'Create relation'
            : 'Save relation'}
      </button>

      {!isNew ? (
        <>
          {!confirmingDelete ? (
            <button
              type="button"
              className="admin-button admin-button--secondary"
              onClick={() => {
                setDeleteError(null)
                setConfirmingDelete(true)
              }}
            >
              Delete relation
            </button>
          ) : (
            <>
              <button
                type="button"
                className="admin-button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Confirm delete'}
              </button>
              <button
                type="button"
                className="admin-button admin-button--secondary"
                onClick={() => setConfirmingDelete(false)}
              >
                Cancel
              </button>
            </>
          )}
          {deleteError ? (
            <Notice tone="error" title="Failed to delete the relation">
              {deleteError}
            </Notice>
          ) : null}
        </>
      ) : null}
    </form>
  )
}
