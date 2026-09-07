import {
  FieldDate,
  FieldMediaId,
  FieldText,
  FieldTextarea,
  SharedSeoFields,
} from '@/components/editor/research-fields'

/** Book structured editor (PU-10-book, §I01/§I03/§I05, F09).
 * Keys mirror `DETAIL_FIELD_MAPS["book"]` in
 * `Back-End/apps/api/admin_content.py`. The existing list/detail endpoints are
 * reused; this editor covers the structured metadata/relations slice. */

export interface BookFieldsProps {
  fields: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
}

export function BookFields({ fields, onChange, disabled }: BookFieldsProps) {
  const prefix = 'book'
  return (
    <div>
      <FieldTextarea
        id={`${prefix}-authors`}
        label="Authors"
        fieldKey="authors"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-isbn`}
        label="ISBN"
        fieldKey="isbn"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-publisher`}
        label="Publisher"
        fieldKey="publisher"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldDate
        id={`${prefix}-publicationDate`}
        label="Publication date"
        fieldKey="publicationDate"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldTextarea
        id={`${prefix}-description`}
        label="Description"
        fieldKey="description"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-url`}
        label="URL"
        fieldKey="url"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-license`}
        label="License"
        fieldKey="license"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-accessState`}
        label="Access state"
        fieldKey="accessState"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldTextarea
        id={`${prefix}-accessibilityNotes`}
        label="Accessibility notes"
        fieldKey="accessibilityNotes"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldMediaId
        id={`${prefix}-coverMediaId`}
        label="Cover media"
        fieldKey="coverMediaId"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <SharedSeoFields
        prefix={prefix}
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  )
}
