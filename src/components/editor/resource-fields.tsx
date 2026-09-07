import {
  FieldMediaId,
  FieldText,
  FieldTextarea,
  SharedSeoFields,
} from '@/components/editor/research-fields'

/** Download (resource) structured editor (PU-10-resource, §I01/§I03/§I05, F11).
 * Keys mirror `DETAIL_FIELD_MAPS["download"]` in
 * `Back-End/apps/api/admin_content.py`. Versioned file replacement history
 * and gated download behavior are server-owned and untouched here. */

export interface ResourceFieldsProps {
  fields: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
}

export function ResourceFields({
  fields,
  onChange,
  disabled,
}: ResourceFieldsProps) {
  const prefix = 'resource'
  return (
    <div>
      <FieldTextarea
        id={`${prefix}-description`}
        label="Description"
        fieldKey="description"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldMediaId
        id={`${prefix}-mediaId`}
        label="Media file"
        fieldKey="mediaId"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-downloadType`}
        label="Download type"
        fieldKey="downloadType"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-language`}
        label="Language"
        fieldKey="language"
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
      <FieldText
        id={`${prefix}-license`}
        label="License"
        fieldKey="license"
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
