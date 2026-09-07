import {
  FieldDate,
  FieldMediaId,
  FieldText,
  FieldTextarea,
  SharedSeoFields,
} from '@/components/editor/research-fields'

/** Course structured editor (PU-10-course, §I01/§I03/§I05, F07).
 * Keys mirror `DETAIL_FIELD_MAPS["course"]` in
 * `Back-End/apps/api/admin_content.py`. Lessons stay independent records
 * (PU-05-lessons) linked by `courseId`; this editor covers the course slice. */

export interface CourseFieldsProps {
  fields: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
}

export function CourseFields({
  fields,
  onChange,
  disabled,
}: CourseFieldsProps) {
  const prefix = 'course'
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
        id={`${prefix}-level`}
        label="Level"
        fieldKey="level"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldTextarea
        id={`${prefix}-prerequisites`}
        label="Prerequisites"
        fieldKey="prerequisites"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldTextarea
        id={`${prefix}-outcomes`}
        label="Outcomes"
        fieldKey="outcomes"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-courseFormat`}
        label="Course format"
        fieldKey="courseFormat"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-courseLanguage`}
        label="Course language"
        fieldKey="courseLanguage"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-availability`}
        label="Availability"
        fieldKey="availability"
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
      <FieldDate
        id={`${prefix}-lastUpdated`}
        label="Last updated"
        fieldKey="lastUpdated"
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
