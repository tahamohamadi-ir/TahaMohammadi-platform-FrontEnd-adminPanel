import {
  FieldDate,
  FieldJsonList,
  FieldMediaId,
  FieldText,
  FieldTextarea,
  SharedSeoFields,
} from '@/components/editor/research-fields'

/** Collection structured editor (PU-10-collection, §I01/§I03/§I05, F12).
 * Keys mirror `DETAIL_FIELD_MAPS["collection"]` in
 * `Back-End/apps/api/admin_content.py`. Member locale pairing is
 * server-validated; this editor records the ordered membership verbatim. */

export interface CollectionFieldsProps {
  fields: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
}

export function CollectionFields({
  fields,
  onChange,
  disabled,
}: CollectionFieldsProps) {
  const prefix = 'collection'
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
      <FieldText
        id={`${prefix}-curatorName`}
        label="Curator name"
        fieldKey="curatorName"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-curatorTitle`}
        label="Curator title"
        fieldKey="curatorTitle"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldTextarea
        id={`${prefix}-criteria`}
        label="Criteria"
        fieldKey="criteria"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldDate
        id={`${prefix}-curatedDate`}
        label="Curated date"
        fieldKey="curatedDate"
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
      <FieldJsonList
        id={`${prefix}-members`}
        label="Members"
        fieldKey="members"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
        description="Ordered members: JSON array of {family,id} references."
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
