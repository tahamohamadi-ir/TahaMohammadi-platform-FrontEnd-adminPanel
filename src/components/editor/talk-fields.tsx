import {
  FieldDate,
  FieldMediaId,
  FieldText,
  FieldTextarea,
  SharedSeoFields,
} from '@/components/editor/research-fields'

/** Talk structured editor (PU-10-talk, §I01/§I03/§I05, F10).
 * Keys mirror `DETAIL_FIELD_MAPS["talk"]` in
 * `Back-End/apps/api/admin_content.py`. */

export interface TalkFieldsProps {
  fields: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
}

export function TalkFields({ fields, onChange, disabled }: TalkFieldsProps) {
  const prefix = 'talk'
  return (
    <div>
      <FieldTextarea
        id={`${prefix}-speakers`}
        label="Speakers"
        fieldKey="speakers"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-eventName`}
        label="Event name"
        fieldKey="eventName"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldDate
        id={`${prefix}-eventDate`}
        label="Event date"
        fieldKey="eventDate"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-location`}
        label="Location"
        fieldKey="location"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldTextarea
        id={`${prefix}-abstract`}
        label="Abstract"
        fieldKey="abstract"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
        rows={5}
      />
      <FieldText
        id={`${prefix}-videoUrl`}
        label="Video URL"
        fieldKey="videoUrl"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-slidesUrl`}
        label="Slides URL"
        fieldKey="slidesUrl"
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
        id={`${prefix}-slidesMediaId`}
        label="Slides media"
        fieldKey="slidesMediaId"
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
