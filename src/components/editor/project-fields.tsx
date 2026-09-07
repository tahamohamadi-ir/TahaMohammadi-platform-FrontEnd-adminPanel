import {
  FieldBoolean,
  FieldDate,
  FieldText,
  FieldTextarea,
  SharedSeoFields,
} from '@/components/editor/research-fields'

/** Project structured editor (PU-10-project, §I01/§I03/§I05, F05).
 * Keys mirror `DETAIL_FIELD_MAPS["project"]` in
 * `Back-End/apps/api/admin_content.py`. Case-study/evidence/collaborator
 * editing rides the existing atomic admin endpoints (PU-04-project-evidence);
 * this editor covers the structured metadata/relations slice only. */

export interface ProjectFieldsProps {
  fields: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
}

export function ProjectFields({
  fields,
  onChange,
  disabled,
}: ProjectFieldsProps) {
  const prefix = 'project'
  return (
    <div>
      <FieldText
        id={`${prefix}-projectType`}
        label="Project type"
        fieldKey="projectType"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldTextarea
        id={`${prefix}-objective`}
        label="Objective"
        fieldKey="objective"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
        rows={4}
      />
      <FieldTextarea
        id={`${prefix}-methodsSummary`}
        label="Methods summary"
        fieldKey="methodsSummary"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
        rows={4}
      />
      <FieldText
        id={`${prefix}-role`}
        label="Role"
        fieldKey="role"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldDate
        id={`${prefix}-startDate`}
        label="Start date"
        fieldKey="startDate"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldDate
        id={`${prefix}-endDate`}
        label="End date"
        fieldKey="endDate"
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
        id={`${prefix}-codeAvailability`}
        label="Code availability"
        fieldKey="codeAvailability"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-dataAvailability`}
        label="Data availability"
        fieldKey="dataAvailability"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-demoAvailability`}
        label="Demo availability"
        fieldKey="demoAvailability"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-codeUrl`}
        label="Code URL"
        fieldKey="codeUrl"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-dataUrl`}
        label="Data URL"
        fieldKey="dataUrl"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-demoUrl`}
        label="Demo URL"
        fieldKey="demoUrl"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldBoolean
        id={`${prefix}-showOnProjects`}
        label="Show on projects index"
        fieldKey="showOnProjects"
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
