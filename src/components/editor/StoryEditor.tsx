import { StoryLibraryField } from './story-library-fields'
import { validateStoryDraft } from './story-validation'

import type {
  CompositionDetailOut,
  CompositionSchemaOut,
  CompositionSectionUpdateIn,
} from '@/lib/api/composition'
import type { components } from '@/generated/admin-api'

import './story-editor.css'

export type StorySaveState = 'idle' | 'saving' | 'saved' | 'conflict' | 'error'
export type StoryAutosaveState = 'idle' | 'dirty' | 'saving' | 'saved'

type BlockSpec = components['schemas']['BlockTypeOut']
type FieldSpec = components['schemas']['BlockFieldSpecOut']
type BlockUpdate = components['schemas']['CompositionBlockUpdateIn']

/** Fallback story catalog — exactly `STORY_BLOCK_TYPES` in
 * `Back-End/apps/composition/blocks.py`. Used only when the schema response
 * is unavailable; the schema remains the authority whenever present. */
export const STORY_BLOCK_TYPES = [
  'heading',
  'text',
  'quote',
  'cta',
  'figure',
  'gallery',
  'video',
  'audio',
  'math',
  'code',
  'table',
  'file',
  'references',
  'related',
  'accordion',
  'tabs',
  'timeline',
  'counters',
  'before_after',
  'slider',
  'divider',
] as const

export interface StoryEditorProps {
  page: CompositionDetailOut
  schema: CompositionSchemaOut | null
  sections: CompositionSectionUpdateIn[]
  onChange: (sections: CompositionSectionUpdateIn[]) => void
  onSave: () => void
  saveState: StorySaveState
  autosaveState: StoryAutosaveState
  conflictDetail?: string | null
  serverError?: string | null
  onResolveConflict: (choice: 'mine' | 'theirs') => void
  dir?: 'ltr' | 'rtl'
}

function specFor(
  schema: CompositionSchemaOut | null,
  blockType: string,
): BlockSpec | null {
  return schema?.blockTypes?.find((spec) => spec.type === blockType) ?? null
}

function move<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items
  const next = [...items]
  const [item] = next.splice(from, 1)
  if (item === undefined) return items
  next.splice(to, 0, item)
  return next
}

interface TableCol {
  key: string
  label: string
}

interface RefItem {
  label: string
  url?: string
}

function ColumnListField({
  inputId,
  value,
  onChange,
}: {
  inputId: string
  value: unknown
  onChange: (cols: TableCol[]) => void
}) {
  const cols: TableCol[] = Array.isArray(value)
    ? (value as TableCol[]).map((c) => ({
        key: String(c.key || ''),
        label: String(c.label || ''),
      }))
    : []

  function updateCol(idx: number, patch: Partial<TableCol>) {
    const next = [...cols]
    const current = next[idx] ?? { key: '', label: '' }
    next[idx] = { ...current, ...patch }
    onChange(next)
  }

  function addCol() {
    let suffix = cols.length + 1
    while (cols.some((col) => col.key === `col_${suffix}`)) suffix += 1
    onChange([...cols, { key: `col_${suffix}`, label: `Column ${cols.length + 1}` }])
  }

  function removeCol(idx: number) {
    onChange(cols.filter((_, i) => i !== idx))
  }

  return (
    <div className="story-editor__list" id={inputId}>
      {cols.map((col, idx) => (
        <div key={idx} className="story-editor__list-item story-editor__row">
          <input
            type="text"
            placeholder="Label"
            value={col.label}
            aria-label={`Column ${idx + 1} label`}
            onChange={(e) => updateCol(idx, { label: e.target.value })}
          />
          <button
            type="button"
            className="story-editor__btn-remove"
            onClick={() => removeCol(idx)}
            aria-label={`Remove column ${idx + 1}`}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="story-editor__btn-add"
        onClick={addCol}
      >
        + Add Column
      </button>
    </div>
  )
}

function RowListField({ inputId, value, columns = [], onChange }: {
  inputId: string; value: unknown; columns?: TableCol[];
  onChange: (rows: Array<Record<string, unknown>>) => void
}) {
  const rows = Array.isArray(value) ? value as Array<Record<string, unknown>> : []
  return <div id={inputId} className="story-editor__table-wrap">
    {columns.length ? <table><thead><tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}<th scope="col">Actions</th></tr></thead>
      <tbody>{rows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column.key}>
        <input aria-label={`Row ${index + 1}, ${column.label}`} value={String(row?.[column.key] ?? '')} dir="auto" onChange={(event) => onChange(rows.map((item, i) => i === index ? { ...item, [column.key]: event.target.value } : item))} />
      </td>)}<td><button type="button" aria-label={`Remove row ${index + 1}`} onClick={() => onChange(rows.filter((_, i) => i !== index))}>Remove</button></td></tr>)}</tbody>
    </table> : <p>Add a column before adding rows.</p>}
    <button type="button" disabled={!columns.length} onClick={() => onChange([...rows, Object.fromEntries(columns.map((column) => [column.key, '']))])}>+ Add Row</button>
  </div>
}

function ReferenceListField({
  inputId,
  value,
  onChange,
}: {
  inputId: string
  value: unknown
  onChange: (items: RefItem[]) => void
}) {
  const items: RefItem[] = Array.isArray(value)
    ? (value as RefItem[]).map((r) => ({
        label: String(r.label || ''),
        url: r.url ? String(r.url) : undefined,
      }))
    : []

  function updateItem(idx: number, patch: Partial<RefItem>) {
    const next = [...items]
    const current = next[idx] ?? { label: '' }
    next[idx] = { ...current, ...patch }
    onChange(next)
  }

  function addItem() {
    onChange([...items, { label: '', url: '' }])
  }

  function removeItem(idx: number) {
    onChange(items.filter((_, i) => i !== idx))
  }

  return (
    <div className="story-editor__list" id={inputId}>
      {items.map((item, idx) => (
        <div key={idx} className="story-editor__list-item story-editor__row">
          <input
            type="text"
            placeholder="Label (required)"
            value={item.label}
            aria-label={`Reference ${idx + 1} label`}
            onChange={(e) => updateItem(idx, { label: e.target.value })}
            required
          />
          <input
            type="url"
            placeholder="URL (optional)"
            value={item.url || ''}
            aria-label={`Reference ${idx + 1} URL`}
            onChange={(e) => updateItem(idx, { url: e.target.value || undefined })}
          />
          <button
            type="button"
            className="story-editor__btn-remove"
            onClick={() => removeItem(idx)}
            aria-label={`Remove reference ${idx + 1}`}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="story-editor__btn-add"
        onClick={addItem}
      >
        + Add Reference
      </button>
    </div>
  )
}

function ItemListField({
  inputId,
  spec,
  value,
  onChange,
}: {
  inputId: string
  spec: FieldSpec
  value: unknown
  onChange: (items: Array<Record<string, unknown>>) => void
}) {
  const items = Array.isArray(value)
    ? (value as Array<Record<string, unknown>>)
    : []
  const itemFields = Array.isArray(spec.itemFields) ? spec.itemFields : []

  function updateItem(idx: number, fieldKey: string, fieldVal: unknown) {
    const next = [...items]
    const current = next[idx] ?? {}
    next[idx] = { ...current, [fieldKey]: fieldVal }
    onChange(next)
  }

  function addItem() {
    const newItem: Record<string, unknown> = {}
    for (const f of itemFields) {
      if (typeof f === 'object' && f && 'key' in f) {
        newItem[String((f as Record<string, unknown>).key)] = ''
      }
    }
    onChange([...items, newItem])
  }

  function removeItem(idx: number) {
    onChange(items.filter((_, i) => i !== idx))
  }

  if (itemFields.length === 0) {
    return <p role="alert">Item fields are unavailable. Reload the block schema before editing.</p>
  }

  return (
    <div className="story-editor__list" id={inputId}>
      {items.map((item, idx) => (
        <div key={idx} className="story-editor__item-card">
          <div className="story-editor__item-header story-editor__row">
            <strong>Item {idx + 1}</strong>
            <button
              type="button"
              className="story-editor__btn-remove"
              onClick={() => removeItem(idx)}
              aria-label={`Remove item ${idx + 1}`}
            >
              Remove
            </button>
          </div>
          <div className="story-editor__item-fields">
            {itemFields.map((fieldObj: Record<string, unknown>) => {
              const fKey = String(fieldObj.key || '')
              const fLabel = String(fieldObj.label || fKey)
              const fType = String(fieldObj.type || 'text')
              const isArea =
                fType === 'textarea' || /body|text|markdown/i.test(fKey)
              return (
                <div key={fKey} className="story-editor__field-group">
                  <label htmlFor={`${inputId}-${idx}-${fKey}`}>
                    {fLabel}
                    {fieldObj.required ? ' (required)' : ''}
                  </label>
                  {isArea ? (
                    <textarea
                      id={`${inputId}-${idx}-${fKey}`}
                      value={String(item[fKey] ?? '')}
                      onChange={(e) => updateItem(idx, fKey, e.target.value)}
                      rows={3}
                      dir="auto"
                    />
                  ) : (
                    <input
                      id={`${inputId}-${idx}-${fKey}`}
                      type="text"
                      value={String(item[fKey] ?? '')}
                      onChange={(e) => updateItem(idx, fKey, e.target.value)}
                      dir="auto"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <button
        type="button"
        className="story-editor__btn-add"
        onClick={addItem}
      >
        + Add Item
      </button>
    </div>
  )
}

function FieldInput({
  spec,
  value,
  onChange,
  inputId,
  settings = {},
  locale = 'en',
  blockType = '',
}: {
  spec: FieldSpec
  value: unknown
  onChange: (value: unknown) => void
  inputId: string
  settings?: Record<string, unknown>
  locale?: string
  blockType?: string
}) {
  if (spec.type === 'media' || spec.type === 'mediaList' || spec.type === 'download' || spec.type === 'relatedList') {
    const mediaType = ['figure', 'gallery', 'before_after', 'slider'].includes(blockType) ? 'image' : ['video', 'audio'].includes(blockType) ? blockType : undefined
    return <StoryLibraryField inputId={inputId} kind={spec.type} value={value} onChange={onChange} locale={locale} mediaType={mediaType} />
  }
  if (spec.options && spec.options.length > 0) {
    return (
      <select
        id={inputId}
        value={value === undefined || value === null ? '' : String(value)}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">(none)</option>
        {spec.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    )
  }
  if (spec.type === 'boolean') {
    return (
      <input
        id={inputId}
        type="checkbox"
        checked={value === true}
        onChange={(event) => onChange(event.target.checked)}
      />
    )
  }
  if (
    spec.type === 'number'
  ) {
    return (
      <input
        id={inputId}
        type="number"
        value={value === undefined || value === null ? '' : String(value)}
        onChange={(event) =>
          onChange(
            event.target.value === '' ? null : Number(event.target.value),
          )
        }

      />
    )
  }
  if (spec.type === 'columnList') {
    return (
      <ColumnListField
        inputId={inputId}
        value={value}
        onChange={(val) => onChange(val)}
      />
    )
  }
  if (spec.type === 'rowList') {
    return (
      <RowListField
        inputId={inputId}
        value={value}
        columns={Array.isArray(settings.columns) ? settings.columns as TableCol[] : []}
        onChange={(val) => onChange(val)}
      />
    )
  }
  if (spec.type === 'referenceList') {
    return (
      <ReferenceListField
        inputId={inputId}
        value={value}
        onChange={(val) => onChange(val)}
      />
    )
  }
  if (
    spec.type === 'itemList' ||
    (Array.isArray(spec.itemFields) && spec.itemFields.length > 0)
  ) {
    return (
      <ItemListField
        inputId={inputId}
        spec={spec}
        value={value}
        onChange={(val) => onChange(val)}
      />
    )
  }
  if (Array.isArray(value) || (spec.type && spec.type.endsWith('List'))) {
    return <p role="alert">This structured field needs an available editor schema.</p>
  }
  if (
    spec.type === 'textarea' ||
    /text|body|markdown|html|code|caption|quote/i.test(spec.key)
  ) {
    return (
      <textarea
        id={inputId}
        value={value === undefined || value === null ? '' : String(value)}
        onChange={(event) => onChange(event.target.value)}
        rows={spec.key === 'code' ? 6 : 3}
        className={spec.key === 'code' ? 'story-editor__code' : undefined}
        dir="auto"
      />
    )
  }
  return (
    <input
      id={inputId}
      type="text"
      value={value === undefined || value === null ? '' : String(value)}
      onChange={(event) => onChange(event.target.value)}
      dir="auto"
    />
  )
}

export function StoryEditor({
  page,
  schema,
  sections,
  onChange,
  onSave,
  saveState,
  autosaveState,
  conflictDetail,
  serverError,
  onResolveConflict,
  dir = 'ltr',
}: StoryEditorProps) {
  const saving = saveState === 'saving'
  const validationIssues = validateStoryDraft(sections, schema)
  const schemaTypes = schema?.blockTypes ?? []
  const availableTypes =
    schemaTypes.length > 0
      ? schemaTypes.map((spec) => spec.type)
      : [...STORY_BLOCK_TYPES]

  function patchSections(
    updater: (
      draft: CompositionSectionUpdateIn[],
    ) => CompositionSectionUpdateIn[],
  ) {
    onChange(updater(sections))
  }

  function setBlockSetting(
    sectionIndex: number,
    blockIndex: number,
    key: string,
    value: unknown,
  ) {
    patchSections((draft) =>
      draft.map((section, si) => {
        if (si !== sectionIndex) return section
        return {
          ...section,
          blocks: (section.blocks ?? []).map((block, bi) => {
            if (bi !== blockIndex) return block
            const settings = { ...(block.settings ?? {}) }
            if (value === null || value === '') {
              delete settings[key]
            } else {
              settings[key] = value
            }
            if (key === 'columns' && Array.isArray(value)) {
              const keys = new Set(value.map((column: TableCol) => column.key))
              settings.rows = (Array.isArray(settings.rows) ? settings.rows : []).map((row: Record<string, unknown>) => Object.fromEntries(Object.entries(row).filter(([column]) => keys.has(column))))
            }
            return { ...block, settings }
          }),
        }
      }),
    )
  }

  function setBlockEnabled(
    sectionIndex: number,
    blockIndex: number,
    enabled: boolean,
  ) {
    patchSections((draft) =>
      draft.map((section, si) => {
        if (si !== sectionIndex) return section
        return {
          ...section,
          blocks: (section.blocks ?? []).map((block, bi) =>
            bi === blockIndex ? { ...block, enabled } : block,
          ),
        }
      }),
    )
  }

  function addBlock(sectionIndex: number, blockType: string) {
    const block: BlockUpdate = { blockType, enabled: true, settings: {} }
    patchSections((draft) =>
      draft.map((section, si) =>
        si === sectionIndex
          ? { ...section, blocks: [...(section.blocks ?? []), block] }
          : section,
      ),
    )
  }

  function removeBlock(sectionIndex: number, blockIndex: number) {
    patchSections((draft) =>
      draft.map((section, si) => {
        if (si !== sectionIndex) return section
        return {
          ...section,
          blocks: (section.blocks ?? []).filter((_, bi) => bi !== blockIndex),
        }
      }),
    )
  }

  return (
    <section
      aria-labelledby="story-editor-title"
      className="story-editor"
      dir={dir}
    >
      <h2 id="story-editor-title">
        Story blocks — {page.title} ({page.locale})
      </h2>
      <p className="muted">
        Status: <strong>{page.status}</strong>
        {page.status === 'published'
          ? ' — edits save as draft until the next publish.'
          : ' — edits save as draft.'}
      </p>
      <p role="status" aria-live="polite" className="muted">
        {autosaveState === 'dirty' ? 'Unsaved changes.' : null}
        {autosaveState === 'saving' ? 'Autosaving…' : null}
        {autosaveState === 'saved' ? 'All changes saved.' : null}
        {saveState === 'saving' ? ' Saving…' : null}
        {saveState === 'saved' ? ' Saved.' : null}
      </p>
      {saveState === 'conflict' ? (
        <div role="alert" className="story-editor__conflict">
          <p>
            <strong>Changed elsewhere.</strong>{' '}
            {conflictDetail ??
              'This story was updated after you loaded it. Your edits were not applied.'}
          </p>
          <p>
            <button type="button" onClick={() => onResolveConflict('theirs')}>
              Reload latest
            </button>{' '}
            <button type="button" disabled={validationIssues.length > 0} onClick={() => onResolveConflict('mine')}>
              Save mine on top
            </button>
          </p>
        </div>
      ) : null}
      {saveState === 'error' && serverError ? (
        <p role="alert" className="story-editor__error">
          {serverError}
        </p>
      ) : null}
      {schema === null ? (
        <p role="note" className="muted">
          Block schema unavailable — showing the story catalog fallback. Field
          validation still runs on the server.
        </p>
      ) : null}

      {validationIssues.length > 0 ? <div role="alert" className="story-editor__error"><p>Complete these fields before saving:</p><ul>{validationIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div> : null}
      {sections.map((section, si) => (
        <fieldset key={si} className="story-editor__section">
          <legend>
            Section {si + 1} · {section.layout ?? '1col'}
          </legend>
          <p className="story-editor__row">
            <button
              type="button"
              aria-label={`Move section ${si + 1} up`}
              disabled={si === 0 || saving}
              onClick={() => patchSections((draft) => move(draft, si, si - 1))}
            >
              ↑ Up
            </button>{' '}
            <button
              type="button"
              aria-label={`Move section ${si + 1} down`}
              disabled={si === sections.length - 1 || saving}
              onClick={() => patchSections((draft) => move(draft, si, si + 1))}
            >
              ↓ Down
            </button>{' '}
            <button
              type="button"
              aria-label={`Remove section ${si + 1}`}
              disabled={saving}
              onClick={() =>
                patchSections((draft) => draft.filter((_, i) => i !== si))
              }
            >
              Remove section
            </button>
          </p>
          {(section.blocks ?? []).map((block, bi) => {
            const spec = specFor(schema, block.blockType)
            const fields = spec?.fields ?? []
            return (
              <article
                key={bi}
                aria-label={`Block ${bi + 1}: ${block.blockType}`}
                className="story-editor__block"
              >
                <h3>
                  {bi + 1}. {block.blockType}
                  {spec ? ` — ${spec.labelFa}` : ''}
                </h3>
                <p className="story-editor__row">
                  <label>
                    <input
                      type="checkbox"
                      checked={block.enabled !== false}
                      disabled={saving}
                      onChange={(event) =>
                        setBlockEnabled(si, bi, event.target.checked)
                      }
                    />{' '}
                    Enabled
                  </label>{' '}
                  <button
                    type="button"
                    aria-label={`Move block ${bi + 1} up in section ${si + 1}`}
                    disabled={bi === 0 || saving}
                    onClick={() =>
                      patchSections((draft) =>
                        draft.map((s, i) =>
                          i === si
                            ? {
                                ...s,
                                blocks: move(s.blocks ?? [], bi, bi - 1),
                              }
                            : s,
                        ),
                      )
                    }
                  >
                    ↑
                  </button>{' '}
                  <button
                    type="button"
                    aria-label={`Move block ${bi + 1} down in section ${si + 1}`}
                    disabled={
                      bi === (section.blocks ?? []).length - 1 || saving
                    }
                    onClick={() =>
                      patchSections((draft) =>
                        draft.map((s, i) =>
                          i === si
                            ? {
                                ...s,
                                blocks: move(s.blocks ?? [], bi, bi + 1),
                              }
                            : s,
                        ),
                      )
                    }
                  >
                    ↓
                  </button>{' '}
                  <button
                    type="button"
                    aria-label={`Remove block ${bi + 1} from section ${si + 1}`}
                    disabled={saving}
                    onClick={() => removeBlock(si, bi)}
                  >
                    Remove
                  </button>
                </p>
                {fields.length === 0 ? (
                  <p className="muted">
                    No field schema for “{block.blockType}” — settings are
                    validated on save by the server.
                  </p>
                ) : (
                  fields.map((field) => {
                    const inputId = `story-s${si}-b${bi}-${field.key}`
                    return (
                      <div key={field.key} className="story-editor__field-wrapper">
                        <label htmlFor={inputId}>
                          {field.label}
                          {(spec?.required ?? []).includes(field.key)
                            ? ' (required)'
                            : ''}
                        </label>
                        <br />
                        <FieldInput
                          spec={field}
                          inputId={inputId}
                          settings={block.settings ?? {}}
                          locale={page.locale}
                          blockType={block.blockType}
                          value={(block.settings ?? {})[field.key]}
                          onChange={(value) =>
                            setBlockSetting(si, bi, field.key, value)
                          }
                        />
                      </div>
                    )
                  })
                )}
              </article>
            )
          })}
          <p className="story-editor__row">
            <label htmlFor={`story-add-block-${si}`}>
              Add block to section {si + 1}
            </label>{' '}
            <select
              id={`story-add-block-${si}`}
              defaultValue=""
              disabled={saving}
              onChange={(event) => {
                if (event.target.value) {
                  addBlock(si, event.target.value)
                  event.target.value = ''
                }
              }}
            >
              <option value="">Choose…</option>
              {availableTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </p>
        </fieldset>
      ))}

      <p className="story-editor__row">
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            patchSections((draft) => [
              ...draft,
              { layout: '1col', ratio: '', enabled: true, blocks: [] },
            ])
          }
        >
          Add section
        </button>{' '}
        <button
          type="button"
          disabled={saving || sections.length === 0 || validationIssues.length > 0}
          onClick={() => { if (validationIssues.length === 0) onSave() }}
        >
          {saving ? 'Saving…' : 'Save story'}
        </button>
      </p>
    </section>
  )
}
