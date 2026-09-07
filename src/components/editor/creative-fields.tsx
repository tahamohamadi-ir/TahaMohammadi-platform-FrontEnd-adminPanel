import {
  FieldBoolean,
  FieldDate,
  FieldMediaId,
  FieldText,
  FieldTextarea,
  SharedSeoFields,
} from '@/components/editor/research-fields'

/** Creative-work structured editor (PU-10-creative, §I01/§I03/§I05, F08).
 * Keys mirror `DETAIL_FIELD_MAPS["creative-work"]` in
 * `Back-End/apps/api/admin_content.py`. */

export interface CreativeFieldsProps {
  fields: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
}

export function CreativeFields({
  fields,
  onChange,
  disabled,
}: CreativeFieldsProps) {
  const prefix = 'creative'
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
        id={`${prefix}-workType`}
        label="Work type"
        fieldKey="workType"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-creatorName`}
        label="Creator name"
        fieldKey="creatorName"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-creatorRole`}
        label="Creator role"
        fieldKey="creatorRole"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldDate
        id={`${prefix}-creationDate`}
        label="Creation date"
        fieldKey="creationDate"
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
        id={`${prefix}-rightsStatement`}
        label="Rights statement"
        fieldKey="rightsStatement"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldBoolean
        id={`${prefix}-consentVerified`}
        label="Consent verified (no student PII stored)"
        fieldKey="consentVerified"
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
