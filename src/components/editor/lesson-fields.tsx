import {
  FieldNumber,
  FieldTextarea,
  SharedSeoFields,
} from '@/components/editor/research-fields'

/** Lesson structured editor (PU-10-lesson, §I01/§I03/§I05, F07).
 * Keys mirror `DETAIL_FIELD_MAPS["lesson"]` in
 * `Back-End/apps/api/admin_content.py`. `courseId` is required by the server
 * and its locale must match the lesson locale — both enforced backend-side. */

export interface LessonFieldsProps {
  fields: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
}

export function LessonFields({
  fields,
  onChange,
  disabled,
}: LessonFieldsProps) {
  const prefix = 'lesson'
  return (
    <div>
      <FieldNumber
        id={`${prefix}-courseId`}
        label="Course id (required)"
        fieldKey="courseId"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
        description="Parent course; locale must match this lesson."
      />
      <FieldNumber
        id={`${prefix}-position`}
        label="Position"
        fieldKey="position"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
        description="Order among the course lessons."
      />
      <FieldTextarea
        id={`${prefix}-summary`}
        label="Summary"
        fieldKey="summary"
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
