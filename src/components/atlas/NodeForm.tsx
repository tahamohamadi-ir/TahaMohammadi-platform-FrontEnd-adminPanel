import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import {
  Notice,
  SelectField,
  TextField,
  ValidationSummary,
} from '@/components/ui/primitives'
import {
  createAtlasNode,
  deleteAtlasNode,
  fetchCanonicalCandidates,
  updateAtlasNode,
  type AtlasCanonicalCandidate,
  type AtlasGroupRow,
  type AtlasNodeRow,
  type AtlasNodeTypeRow,
  type AtlasNodeWriteBody,
} from '@/lib/api/atlas'
import { AdminApiError } from '@/lib/api/auth'

/** Canonical source registry order (backend `CANONICAL_SOURCE_KEYS`). */
const CANONICAL_SOURCES = [
  'profile',
  'research_topic',
  'project',
  'publication',
  'method',
  'technology',
] as const

const MOBILE_PRIORITIES = ['auto', 'featured', 'hidden'] as const

const LOCALES = [
  { code: 'en', name: 'English' },
  { code: 'fa', name: 'Persian' },
] as const

interface OverrideDraft {
  label: string
  summary: string
  accessibleLabel: string
  aliases: string
}

const EMPTY_OVERRIDE: OverrideDraft = {
  label: '',
  summary: '',
  accessibleLabel: '',
  aliases: '',
}

export interface NodeFormProps {
  versionId: number
  revision: string
  node: AtlasNodeRow | null
  nodeTypes?: AtlasNodeTypeRow[]
  groups?: AtlasGroupRow[]
  onSaved: (row: AtlasNodeRow) => void
  onDeleted?: (key: string) => void
}

function pinNumber(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? String(value)
    : ''
}

function localeCopyMissing(node: AtlasNodeRow | null, locale: string): boolean {
  const status = node?.localeStatus as
    Record<string, unknown> | null | undefined
  return status?.[locale] !== true
}

/** Node authoring form (Plan B Task 11).
 *
 * Edits one node (or creates one when `node` is null) through the Task-8
 * client. The public key is identity and is never rendered as an editable
 * control. Blank overrides are omitted from the body so the canonical copy
 * applies (`blank = canonical copy`).
 */
export function NodeForm({
  versionId,
  revision,
  node,
  nodeTypes = [],
  groups = [],
  onSaved,
  onDeleted,
}: NodeFormProps) {
  const isNew = node === null
  const [nodeTypeKey, setNodeTypeKey] = useState(node?.nodeTypeKey ?? '')
  const [canonicalSource, setCanonicalSource] = useState(
    node?.canonicalSource ?? 'none',
  )
  const [canonicalKey, setCanonicalKey] = useState(
    node?.canonicalTranslationKey ?? null,
  )
  const [canonicalTitle, setCanonicalTitle] = useState('')
  const [pickerSource, setPickerSource] = useState<string>('research_topic')
  const [pickerQuery, setPickerQuery] = useState('')
  const [pickerResults, setPickerResults] = useState<
    AtlasCanonicalCandidate[] | null
  >(null)
  const [pickerError, setPickerError] = useState<string | null>(null)
  const [pickerPending, setPickerPending] = useState(false)
  const [importance, setImportance] = useState(String(node?.importance ?? 50))
  const [visible, setVisible] = useState(node?.visible ?? true)
  const [mobilePriority, setMobilePriority] = useState(
    node?.mobileOverviewPriority ?? 'auto',
  )
  const [overrides, setOverrides] = useState<Record<string, OverrideDraft>>({
    en: { ...EMPTY_OVERRIDE },
    fa: { ...EMPTY_OVERRIDE },
  })
  const [groupKeys, setGroupKeys] = useState<string[]>(node?.groupKeys ?? [])
  const [pinX, setPinX] = useState(() =>
    pinNumber((node?.pin as Record<string, unknown> | null | undefined)?.['x']),
  )
  const [pinY, setPinY] = useState(() =>
    pinNumber((node?.pin as Record<string, unknown> | null | undefined)?.['y']),
  )
  const [clientError, setClientError] = useState<string | null>(null)
  const [fieldIssues, setFieldIssues] = useState<
    { field: string; message: string; targetId: string }[]
  >([])
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const activeTypes = nodeTypes.filter((t) => t.active)

  const saveMutation = useMutation({
    mutationFn: (body: AtlasNodeWriteBody) =>
      isNew || node === null
        ? createAtlasNode(versionId, body, revision)
        : updateAtlasNode(versionId, node.publicKey, body, revision),
    onSuccess: (row) => {
      setClientError(null)
      setFieldIssues([])
      setSaveError(null)
      onSaved(row)
    },
    onError: (caught) => {
      if (caught instanceof AdminApiError) {
        const issues = Object.entries(caught.fieldErrors ?? {}).map(
          ([field, message]) => ({
            field,
            message,
            targetId: `node-${field}`,
          }),
        )
        setFieldIssues(issues)
        if (caught.code === 'STALE_REVISION') {
          setSaveError(
            'The version changed on the server since you loaded it. Reload the editor and retry.',
          )
        } else {
          setSaveError(caught.message)
        }
      } else {
        setFieldIssues([])
        setSaveError('Failed to save the node.')
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (node === null) {
        return Promise.resolve()
      }
      return deleteAtlasNode(versionId, node.publicKey, revision)
    },
    onSuccess: () => {
      setDeleteError(null)
      setConfirmingDelete(false)
      if (node !== null) {
        onDeleted?.(node.publicKey)
      }
    },
    onError: (caught) => {
      setDeleteError(
        caught instanceof AdminApiError
          ? caught.message
          : 'Failed to delete the node.',
      )
    },
  })

  function setOverride(
    locale: string,
    field: keyof OverrideDraft,
    value: string,
  ) {
    setOverrides((prev) => ({
      ...prev,
      [locale]: { ...(prev[locale] ?? { ...EMPTY_OVERRIDE }), [field]: value },
    }))
  }

  function toggleGroup(key: string) {
    setGroupKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  async function searchRecords() {
    setPickerPending(true)
    setPickerError(null)
    try {
      const rows = await fetchCanonicalCandidates(pickerSource, pickerQuery)
      setPickerResults(rows)
    } catch (caught) {
      setPickerResults(null)
      setPickerError(
        caught instanceof AdminApiError
          ? caught.message
          : 'Failed to search canonical records.',
      )
    } finally {
      setPickerPending(false)
    }
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setClientError(null)
    setFieldIssues([])
    setSaveError(null)

    if (nodeTypeKey === '') {
      setClientError('Node type is required.')
      return
    }
    const parsedImportance = Number(importance)
    if (
      importance.trim() === '' ||
      !Number.isFinite(parsedImportance) ||
      parsedImportance < 0 ||
      parsedImportance > 100
    ) {
      setClientError('Importance must be a number from 0 to 100.')
      return
    }
    const xSet = pinX.trim() !== ''
    const ySet = pinY.trim() !== ''
    if (
      (xSet || ySet) &&
      (!(xSet && ySet) ||
        !Number.isFinite(Number(pinX)) ||
        !Number.isFinite(Number(pinY)))
    ) {
      setClientError('Pin needs both pin coordinates (x and y).')
      return
    }

    const bodyOverrides: NonNullable<AtlasNodeWriteBody['overrides']> = {}
    for (const { code } of LOCALES) {
      const draft = overrides[code] ?? { ...EMPTY_OVERRIDE }
      const aliases = draft.aliases
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
      const hasContent =
        draft.label.trim() !== '' ||
        draft.summary.trim() !== '' ||
        draft.accessibleLabel.trim() !== '' ||
        aliases.length > 0
      if (hasContent) {
        bodyOverrides[code] = {
          ...(draft.label.trim() !== '' ? { label: draft.label.trim() } : {}),
          ...(draft.summary.trim() !== ''
            ? { summary: draft.summary.trim() }
            : {}),
          ...(draft.accessibleLabel.trim() !== ''
            ? { accessibleLabel: draft.accessibleLabel.trim() }
            : {}),
          ...(aliases.length > 0 ? { aliases } : {}),
        }
      }
    }

    saveMutation.mutate({
      nodeTypeKey,
      canonicalSource,
      canonicalTranslationKey: canonicalKey,
      importance: parsedImportance,
      visible,
      mobileOverviewPriority: mobilePriority,
      groupKeys,
      pin: xSet && ySet ? { x: Number(pinX), y: Number(pinY) } : null,
      ...(Object.keys(bodyOverrides).length > 0
        ? { overrides: bodyOverrides }
        : {}),
    })
  }

  return (
    <form
      id="node-form"
      aria-label={isNew ? 'Create node' : 'Edit node'}
      onSubmit={handleSave}
    >
      {node !== null ? (
        <p>
          Canonical record:{' '}
          <span>
            {node.canonicalTranslationKey ?? 'none'} ({node.canonicalSource})
          </span>
        </p>
      ) : null}

      <fieldset>
        <legend>Canonical record</legend>
        <SelectField
          id="node-picker-source"
          label="Record source"
          value={pickerSource}
          onChange={setPickerSource}
          options={CANONICAL_SOURCES.map((source) => ({
            value: source,
            label: source,
          }))}
        />
        <TextField
          id="node-picker-search"
          label="Canonical search"
          value={pickerQuery}
          onChange={setPickerQuery}
        />
        <button
          type="button"
          className="admin-button admin-button--secondary"
          onClick={() => void searchRecords()}
          disabled={pickerPending}
        >
          {pickerPending ? 'Searching…' : 'Search records'}
        </button>
        {pickerError ? (
          <Notice tone="error" title="Canonical search failed">
            {pickerError}
          </Notice>
        ) : null}
        {pickerResults !== null ? (
          <ul>
            {pickerResults.map((row) => {
              const gated =
                row.publishable?.['en'] !== true &&
                row.publishable?.['fa'] !== true
              return (
                <li key={row.translationKey}>
                  <button
                    type="button"
                    className="admin-button admin-button--secondary"
                    disabled={gated}
                    title={
                      gated
                        ? 'Not publishable in any locale yet'
                        : `EN ${row.localeStatus?.['en'] === true ? 'ready' : 'missing'} / FA ${row.localeStatus?.['fa'] === true ? 'ready' : 'missing'}`
                    }
                    onClick={() => {
                      setCanonicalSource(pickerSource)
                      setCanonicalKey(row.translationKey)
                      setCanonicalTitle(row.title)
                    }}
                  >
                    {row.title}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}
        {canonicalKey !== null ? (
          <p>
            Selected: <span>{canonicalTitle || canonicalKey}</span>{' '}
            <button
              type="button"
              className="admin-button admin-button--secondary"
              onClick={() => {
                setCanonicalSource('none')
                setCanonicalKey(null)
                setCanonicalTitle('')
              }}
            >
              Remove canonical link
            </button>
          </p>
        ) : null}
      </fieldset>

      <SelectField
        id="node-type"
        label="Node type"
        value={nodeTypeKey}
        onChange={setNodeTypeKey}
        options={[
          { value: '', label: 'Select a type' },
          ...activeTypes.map((t) => ({ value: t.key, label: t.key })),
        ]}
      />

      <TextField
        id="node-importance"
        label="Importance"
        type="number"
        value={importance}
        onChange={setImportance}
        description="0–100. Higher importance sorts earlier in compact overviews."
      />

      <div className="admin-field admin-field--check">
        <input
          className="admin-check"
          type="checkbox"
          id="node-visible"
          checked={visible}
          onChange={(event) => setVisible(event.currentTarget.checked)}
        />
        <label className="admin-field__label" htmlFor="node-visible">
          Visible
        </label>
      </div>

      <fieldset>
        <legend>Mobile overview priority</legend>
        {MOBILE_PRIORITIES.map((option) => (
          <div key={option} className="admin-field admin-field--check">
            <input
              className="admin-check"
              type="radio"
              id={`node-priority-${option}`}
              name="mobile-overview-priority"
              value={option}
              checked={mobilePriority === option}
              onChange={() => setMobilePriority(option)}
            />
            <label
              className="admin-field__label"
              htmlFor={`node-priority-${option}`}
            >
              {option === 'auto'
                ? 'Auto'
                : option === 'featured'
                  ? 'Featured'
                  : 'Hidden'}
            </label>
          </div>
        ))}
      </fieldset>

      {LOCALES.map(({ code, name }) => (
        <fieldset key={code}>
          <legend>{name} override</legend>
          <TextField
            id={`node-override-${code}-label`}
            label={`${name} label`}
            value={overrides[code]?.label ?? ''}
            onChange={(value) => setOverride(code, 'label', value)}
            description="Blank = canonical copy."
          />
          <TextField
            id={`node-override-${code}-summary`}
            label={`${name} summary`}
            value={overrides[code]?.summary ?? ''}
            onChange={(value) => setOverride(code, 'summary', value)}
            description="Blank = canonical copy."
          />
          <TextField
            id={`node-override-${code}-accessible`}
            label={`${name} accessible label`}
            value={overrides[code]?.accessibleLabel ?? ''}
            onChange={(value) => setOverride(code, 'accessibleLabel', value)}
            description="Blank = canonical copy."
          />
          <TextField
            id={`node-override-${code}-aliases`}
            label={`${name} aliases`}
            value={overrides[code]?.aliases ?? ''}
            onChange={(value) => setOverride(code, 'aliases', value)}
            description="Comma-separated. Blank = canonical copy."
          />
          {(overrides[code]?.label ?? '').trim() === '' &&
          localeCopyMissing(node, code) ? (
            <Notice tone="warning" title={`No ${name} canonical copy`}>
              {`Fill the ${name.toLowerCase()} override — a visible node needs both locales before publish.`}
            </Notice>
          ) : null}
        </fieldset>
      ))}

      <fieldset>
        <legend>Groups</legend>
        {groups.map((group) => (
          <div key={group.key} className="admin-field admin-field--check">
            <input
              className="admin-check"
              type="checkbox"
              id={`node-group-${group.key}`}
              checked={groupKeys.includes(group.key)}
              onChange={() => toggleGroup(group.key)}
            />
            <label
              className="admin-field__label"
              htmlFor={`node-group-${group.key}`}
            >
              {group.label}
            </label>
          </div>
        ))}
      </fieldset>

      <fieldset>
        <legend>Pin</legend>
        <TextField
          id="node-pin-x"
          label="Pin x"
          type="number"
          value={pinX}
          onChange={setPinX}
        />
        <TextField
          id="node-pin-y"
          label="Pin y"
          type="number"
          value={pinY}
          onChange={setPinY}
        />
        <button
          type="button"
          className="admin-button admin-button--secondary"
          disabled
          title="Available when the authoring graph selects a position."
          aria-describedby="node-pin-current-hint"
        >
          Pin to current position
        </button>
        <p id="node-pin-current-hint" className="admin-field__description">
          Available when the authoring graph selects a position.
        </p>
        <button
          type="button"
          className="admin-button admin-button--secondary"
          onClick={() => {
            setPinX('')
            setPinY('')
          }}
        >
          Clear pin
        </button>
      </fieldset>

      {clientError ? (
        <p role="alert" className="admin-field__error">
          {clientError}
        </p>
      ) : null}
      <ValidationSummary title="Node payload invalid" errors={fieldIssues} />
      {saveError ? (
        <Notice tone="error" title="Failed to save the node">
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
            ? 'Create node'
            : 'Save node'}
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
              Delete node
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
            <Notice tone="error" title="Failed to delete the node">
              {deleteError}
            </Notice>
          ) : null}
        </>
      ) : null}
    </form>
  )
}
