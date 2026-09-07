import {
  FieldMediaId,
  FieldNumber,
  FieldText,
  FieldTextarea,
  SharedSeoFields,
} from '@/components/editor/research-fields'

/** Article structured editor (PU-10-article, §I01/§I03/§I05, F06).
 * Keys mirror `DETAIL_FIELD_MAPS["article"]` in
 * `Back-End/apps/api/admin_content.py`. */

export interface ArticleFieldsProps {
  fields: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
}

export function ArticleFields({
  fields,
  onChange,
  disabled,
}: ArticleFieldsProps) {
  const prefix = 'article'
  return (
    <div>
      <FieldTextarea
        id={`${prefix}-excerpt`}
        label="Excerpt"
        fieldKey="excerpt"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldTextarea
        id={`${prefix}-body`}
        label="Body"
        fieldKey="body"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
        rows={6}
      />
      <FieldText
        id={`${prefix}-license`}
        label="License"
        fieldKey="license"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldNumber
        id={`${prefix}-readingTimeMinutes`}
        label="Reading time (minutes)"
        fieldKey="readingTimeMinutes"
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
        id={`${prefix}-featuredImageId`}
        label="Featured image"
        fieldKey="featuredImageId"
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
