import {
  FieldJsonList,
  FieldNumber,
  FieldTextarea,
  SharedSeoFields,
} from '@/components/editor/research-fields'

/** Series structured editor (PU-10-series, §I01/§I03/§I05, F12).
 * Keys mirror `DETAIL_FIELD_MAPS["series"]` in
 * `Back-End/apps/api/admin_content.py` (`description`, numeric `ordering`,
 * ordered `members`). */

export interface SeriesFieldsProps {
  fields: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
}

export function SeriesFields({
  fields,
  onChange,
  disabled,
}: SeriesFieldsProps) {
  const prefix = 'series'
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
      <FieldNumber
        id={`${prefix}-ordering`}
        label="Ordering"
        fieldKey="ordering"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
        description="Manual order within the locale."
      />
      <FieldJsonList
        id={`${prefix}-members`}
        label="Members"
        fieldKey="members"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
        description="Ordered members: JSON array of {family,id,position}."
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
