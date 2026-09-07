import {
  FieldDate,
  FieldMediaId,
  FieldNumber,
  FieldText,
  FieldTextarea,
  SharedSeoFields,
} from '@/components/editor/research-fields'

/** Publication structured editor (PU-10-publication, §I01/§I03/§I05, F04).
 * Keys mirror `DETAIL_FIELD_MAPS["publication"]` in
 * `Back-End/apps/api/admin_content.py`. Choice-valued keys (publicationType,
 * accessState, …) stay free-text inputs — the backend enum is the authority.
 * Story attachment stays in the PU-09-host story section. */

export interface PublicationFieldsProps {
  fields: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
}

export function PublicationFields({
  fields,
  onChange,
  disabled,
}: PublicationFieldsProps) {
  const prefix = 'publication'
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
        id={`${prefix}-venue`}
        label="Venue"
        fieldKey="venue"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldDate
        id={`${prefix}-date`}
        label="Date"
        fieldKey="date"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-doi`}
        label="DOI"
        fieldKey="doi"
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
        id={`${prefix}-pdfUrl`}
        label="PDF URL"
        fieldKey="pdfUrl"
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
        id={`${prefix}-publicationType`}
        label="Publication type"
        fieldKey="publicationType"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-academicStage`}
        label="Academic stage"
        fieldKey="academicStage"
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
        id={`${prefix}-preprintUrl`}
        label="Preprint URL"
        fieldKey="preprintUrl"
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
        id={`${prefix}-datasetUrl`}
        label="Dataset URL"
        fieldKey="datasetUrl"
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
      <FieldTextarea
        id={`${prefix}-citationText`}
        label="Citation text"
        fieldKey="citationText"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldMediaId
        id={`${prefix}-pdfMediaId`}
        label="PDF media"
        fieldKey="pdfMediaId"
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
      <FieldNumber
        id={`${prefix}-citationCount`}
        label="Citation count"
        fieldKey="citationCount"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-citationSource`}
        label="Citation source"
        fieldKey="citationSource"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldDate
        id={`${prefix}-citationLastVerified`}
        label="Citation last verified"
        fieldKey="citationLastVerified"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
      <FieldText
        id={`${prefix}-citationVisibility`}
        label="Citation visibility"
        fieldKey="citationVisibility"
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
