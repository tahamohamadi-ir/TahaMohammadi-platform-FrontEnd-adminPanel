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

function FieldInput({
  spec,
  value,
  onChange,
  inputId,
}: {
  spec: FieldSpec
  value: unknown
  onChange: (value: unknown) => void
  inputId: string
}) {
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
  if (spec.type === 'number' || spec.type === 'media') {
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
        aria-describedby={spec.type === 'media' ? `${inputId}-hint` : undefined}
      />
    )
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
            <button type="button" onClick={() => onResolveConflict('mine')}>
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
                      <p key={field.key}>
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
                          value={(block.settings ?? {})[field.key]}
                          onChange={(value) =>
                            setBlockSetting(si, bi, field.key, value)
                          }
                        />
                        {field.type === 'media' ? (
                          <span id={`${inputId}-hint`} className="muted">
                            {' '}
                            Media library id.
                          </span>
                        ) : null}
                      </p>
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
          disabled={saving || sections.length === 0}
          onClick={onSave}
        >
          {saving ? 'Saving…' : 'Save story'}
        </button>
      </p>
    </section>
  )
}
