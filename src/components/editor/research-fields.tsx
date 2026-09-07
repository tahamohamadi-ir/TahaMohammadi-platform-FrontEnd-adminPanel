import { useRef, useState } from 'react'

/** Research topic / research statement structured editor (PU-10-research,
 * PRODUCT-INTERFACES-V2 §I01/§I03/§I05, family F03).
 *
 * Field keys mirror `DETAIL_FIELD_MAPS["research-topic"]` and
 * `["research-statement"]` in `Back-End/apps/api/admin_content.py` exactly —
 * no field is invented here. The backend validates references (statement PDF
 * must be a PDF media row), locale pairing, and required relations; this
 * editor only records values and surfaces server errors through the host
 * section. Story attachment stays in the PU-09-host story section.
 *
 * The widget set below doubles as the shared PU-10 widget kit: later family
 * packets import these widgets read-only instead of duplicating them. */

export interface ResearchFieldsProps {
  entity: 'research-topic' | 'research-statement'
  fields: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
}

export function textOf(value: unknown): string {
  return value === undefined || value === null ? '' : String(value)
}

export function FieldText({
  id,
  label,
  fieldKey,
  fields,
  onChange,
  disabled,
  description,
}: {
  id: string
  label: string
  fieldKey: string
  fields: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
  description?: string
}) {
  return (
    <p>
      <label htmlFor={id}>{label}</label>
      <br />
      <input
        id={id}
        type="text"
        value={textOf(fields[fieldKey])}
        disabled={disabled}
        onChange={(event) => onChange(fieldKey, event.target.value)}
        aria-describedby={description ? `${id}-hint` : undefined}
        dir="auto"
      />
      {description ? (
        <span id={`${id}-hint`} className="muted">
          {' '}
          {description}
        </span>
      ) : null}
    </p>
  )
}

export function FieldTextarea({
  id,
  label,
  fieldKey,
  fields,
  onChange,
  disabled,
  rows = 3,
}: {
  id: string
  label: string
  fieldKey: string
  fields: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
  rows?: number
}) {
  return (
    <p>
      <label htmlFor={id}>{label}</label>
      <br />
      <textarea
        id={id}
        value={textOf(fields[fieldKey])}
        disabled={disabled}
        rows={rows}
        onChange={(event) => onChange(fieldKey, event.target.value)}
        dir="auto"
      />
    </p>
  )
}

export function FieldNumber({
  id,
  label,
  fieldKey,
  fields,
  onChange,
  disabled,
  description,
}: {
  id: string
  label: string
  fieldKey: string
  fields: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
  description?: string
}) {
  const raw = fields[fieldKey]
  return (
    <p>
      <label htmlFor={id}>{label}</label>
      <br />
      <input
        id={id}
        type="number"
        value={raw === undefined || raw === null ? '' : String(raw)}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            fieldKey,
            event.target.value === '' ? null : Number(event.target.value),
          )
        }
        aria-describedby={description ? `${id}-hint` : undefined}
      />
      {description ? (
        <span id={`${id}-hint`} className="muted">
          {' '}
          {description}
        </span>
      ) : null}
    </p>
  )
}

export function FieldBoolean({
  id,
  label,
  fieldKey,
  fields,
  onChange,
  disabled,
}: {
  id: string
  label: string
  fieldKey: string
  fields: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
}) {
  return (
    <p>
      <label>
        <input
          id={id}
          type="checkbox"
          checked={fields[fieldKey] === true}
          disabled={disabled}
          onChange={(event) => onChange(fieldKey, event.target.checked)}
        />{' '}
        {label}
      </label>
    </p>
  )
}

export function FieldDate({
  id,
  label,
  fieldKey,
  fields,
  onChange,
  disabled,
}: {
  id: string
  label: string
  fieldKey: string
  fields: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
}) {
  return (
    <p>
      <label htmlFor={id}>{label}</label>
      <br />
      <input
        id={id}
        type="date"
        value={textOf(fields[fieldKey]).slice(0, 10)}
        disabled={disabled}
        onChange={(event) => onChange(fieldKey, event.target.value || null)}
      />
    </p>
  )
}

/** Media-library reference by numeric id. Uploads and library browsing stay on
 * the Media page; this control only records the reference. */
export function FieldMediaId({
  id,
  label,
  fieldKey,
  fields,
  onChange,
  disabled,
}: {
  id: string
  label: string
  fieldKey: string
  fields: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
}) {
  return (
    <FieldNumber
      id={id}
      label={label}
      fieldKey={fieldKey}
      fields={fields}
      onChange={onChange}
      disabled={disabled}
      description="Media library id (empty clears)."
    />
  )
}

/** JSON list field (related records, members, string lists). Propagates only
 * valid JSON arrays; anything else stays local with a visible error so a
 * malformed value can never be saved. */
export function FieldJsonList({
  id,
  label,
  fieldKey,
  fields,
  onChange,
  disabled,
  description,
}: {
  id: string
  label: string
  fieldKey: string
  fields: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
  description?: string
}) {
  const initial = fields[fieldKey]
  const seeded =
    initial === undefined || initial === null
      ? ''
      : JSON.stringify(initial, null, 2)
  const [text, setText] = useState(seeded)
  const [error, setError] = useState<string | null>(null)
  const lastSeeded = useRef(seeded)
  if (lastSeeded.current !== seeded) {
    lastSeeded.current = seeded
    setText(seeded)
    setError(null)
  }
  return (
    <p>
      <label htmlFor={id}>{label}</label>
      <br />
      <textarea
        id={id}
        value={text}
        disabled={disabled}
        rows={4}
        dir="ltr"
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
        onChange={(event) => {
          const next = event.target.value
          setText(next)
          if (next.trim() === '') {
            setError(null)
            onChange(fieldKey, [])
            return
          }
          try {
            const parsed: unknown = JSON.parse(next)
            if (!Array.isArray(parsed)) {
              setError('Must be a JSON array.')
              return
            }
            setError(null)
            onChange(fieldKey, parsed)
          } catch {
            setError('Invalid JSON — fix it before saving.')
          }
        }}
      />
      <br />
      <span id={`${id}-hint`} className="muted">
        {description ?? 'JSON array.'}
      </span>
      {error ? (
        <span id={`${id}-error`} role="alert">
          {' '}
          {error}
        </span>
      ) : null}
    </p>
  )
}

export function SharedSeoFields({
  prefix,
  fields,
  onChange,
  disabled,
}: {
  prefix: string
  fields: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
}) {
  return (
    <>
      <FieldText
        id={`${prefix}-seoTitle`}
        label="SEO title"
        fieldKey="seoTitle"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldTextarea
        id={`${prefix}-seoDescription`}
        label="SEO description"
        fieldKey="seoDescription"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldMediaId
        id={`${prefix}-socialImageId`}
        label="Social image"
        fieldKey="socialImageId"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-translationKey`}
        label="Translation key"
        fieldKey="translationKey"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
        description="Links the fa/en pair; empty leaves it unlinked."
      />
      <FieldJsonList
        id={`${prefix}-relatedRecords`}
        label="Related records"
        fieldKey="relatedRecords"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
        description="JSON array of {family,id} references."
      />
    </>
  )
}

export function ResearchFields({
  entity,
  fields,
  onChange,
  disabled,
}: ResearchFieldsProps) {
  const prefix = `research-${entity === 'research-topic' ? 'topic' : 'statement'}`
  return (
    <div>
      {entity === 'research-topic' ? (
        <>
          <FieldTextarea
            id={`${prefix}-summary`}
            label="Summary"
            fieldKey="summary"
            fields={fields}
            onChange={onChange}
            disabled={disabled}
          />
          <FieldTextarea
            id={`${prefix}-motivation`}
            label="Motivation"
            fieldKey="motivation"
            fields={fields}
            onChange={onChange}
            disabled={disabled}
            rows={4}
          />
          <FieldTextarea
            id={`${prefix}-problems`}
            label="Problems"
            fieldKey="problems"
            fields={fields}
            onChange={onChange}
            disabled={disabled}
            rows={4}
          />
          <FieldTextarea
            id={`${prefix}-researchQuestions`}
            label="Research questions"
            fieldKey="researchQuestions"
            fields={fields}
            onChange={onChange}
            disabled={disabled}
            rows={4}
          />
          <FieldTextarea
            id={`${prefix}-methods`}
            label="Methods"
            fieldKey="methods"
            fields={fields}
            onChange={onChange}
            disabled={disabled}
            rows={4}
          />
          <FieldTextarea
            id={`${prefix}-futureDirections`}
            label="Future directions"
            fieldKey="futureDirections"
            fields={fields}
            onChange={onChange}
            disabled={disabled}
            rows={4}
          />
        </>
      ) : (
        <>
          <FieldTextarea
            id={`${prefix}-body`}
            label="Statement body"
            fieldKey="body"
            fields={fields}
            onChange={onChange}
            disabled={disabled}
            rows={6}
          />
          <FieldMediaId
            id={`${prefix}-statementPdfId`}
            label="Statement PDF"
            fieldKey="statementPdfId"
            fields={fields}
            onChange={onChange}
            disabled={disabled}
          />
        </>
      )}
      <SharedSeoFields
        prefix={prefix}
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  )
}
