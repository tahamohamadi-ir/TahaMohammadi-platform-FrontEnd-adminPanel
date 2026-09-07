import {
  FieldNumber,
  FieldText,
  FieldTextarea,
  SharedSeoFields,
} from '@/components/editor/research-fields'

/** Profile (F13 About / CV) structured editor (PU-08-profile, §I03/§I04, F13).
 * Keys mirror `DETAIL_FIELD_MAPS["profile"]` in
 * `Back-End/apps/api/admin_content.py` and target interface contract §I03.
 *
 * Verifiable owner profile details, timeline attachments, CV and
 * research-profile resource selection with locale-safe directionality.
 * No fabricated skill bars or percentages (PRODUCT-SPEC F13). */

export interface ProfileFieldsProps {
  fields: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
}

export function ProfileFields({
  fields,
  onChange,
  disabled,
}: ProfileFieldsProps) {
  const prefix = 'profile'
  return (
    <div>
      <FieldTextarea
        id={`${prefix}-shortBio`}
        label="Short bio"
        fieldKey="shortBio"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
        rows={3}
      />
      <FieldTextarea
        id={`${prefix}-longBio`}
        label="Long bio"
        fieldKey="longBio"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
        rows={5}
      />
      <FieldText
        id={`${prefix}-availability`}
        label="Collaboration availability"
        fieldKey="availability"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
        description="Current availability for research collaboration, consulting, or speaking."
      />
      <FieldTextarea
        id={`${prefix}-body`}
        label="Profile body"
        fieldKey="body"
        fields={fields}
        onChange={onChange}
        disabled={disabled}
        rows={6}
      />

      <fieldset
        style={{
          border: '1px solid var(--border, #ccc)',
          padding: '1rem',
          margin: '1rem 0',
        }}
      >
        <legend style={{ fontWeight: 'bold' }}>
          Resource selection (§I03/F13)
        </legend>
        <FieldNumber
          id={`${prefix}-cvResourceId`}
          label="CV resource"
          fieldKey="cvResourceId"
          fields={fields}
          onChange={onChange}
          disabled={disabled}
          description="Download record ID for the official Academic CV."
        />
        <FieldNumber
          id={`${prefix}-researchProfileResourceId`}
          label="Research profile resource"
          fieldKey="researchProfileResourceId"
          fields={fields}
          onChange={onChange}
          disabled={disabled}
          description="Download record ID for the detailed Research Profile."
        />
      </fieldset>

      <SharedSeoFields
        prefix={prefix}
        fields={fields}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  )
}
