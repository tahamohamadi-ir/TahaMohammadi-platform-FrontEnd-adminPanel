import {
  SelectField,
  TextareaField,
  TextField,
} from '@/components/ui/primitives'
import { CONTENT_STATUSES, type ContentFieldSpecOut } from '@/lib/api/content'
import { useMediaList } from '@/lib/api/hooks/useMedia'

/** Draft and review stay on the metadata form. Publish, schedule, and
 * archive go through the lifecycle actions so a save cannot skip the
 * confirmation dialog or the owner approval gate. The current lifecycle
 * value stays selectable so a resave does not change it by accident. */
export function metadataStatusOptions(current: string | undefined) {
  const currentStatus = current ?? 'draft'
  return CONTENT_STATUSES.filter(
    (value) =>
      value === 'draft' || value === 'review' || value === currentStatus,
  ).map((value) => ({ value, label: value }))
}

/** Media-typed schema field backed by the media library (ADMIN-180):
 * pick an existing library item; uploads happen on the Media page. */
function MediaPickerField({
  spec,
  value,
}: {
  spec: ContentFieldSpecOut
  value: unknown
}) {
  const id = `field-${spec.key}`
  const list = useMediaList({ pageSize: 100 })
  const current = value === undefined || value === null ? '' : String(value)
  return (
    <div>
      <SelectField
        id={id}
        label={spec.label}
        defaultValue={current || ''}
        description="Choose from the media library; upload new files on the Media page."
        options={[
          { value: '', label: '(none)' },
          ...(list.data?.items ?? []).map((item) => ({
            value: String(item.id),
            label: `${item.title} (${item.mime})`,
          })),
        ]}
      />
      {list.isPending ? (
        <p role="status" className="muted">
          Loading media options…
        </p>
      ) : null}
      {list.error ? (
        <p role="alert" className="muted">
          Media list unavailable — type the id manually.
        </p>
      ) : null}
    </div>
  )
}

export function SchemaField({
  spec,
  value,
}: {
  spec: ContentFieldSpecOut
  value: unknown
}) {
  const id = `field-${spec.key}`
  const asText = value === undefined || value === null ? '' : String(value)
  if (spec.type === 'media') {
    return <MediaPickerField spec={spec} value={value} />
  }
  if (spec.type === 'textarea') {
    return <TextareaField id={id} label={spec.label} defaultValue={asText} />
  }
  if (spec.type === 'boolean') {
    return (
      <TextField
        id={id}
        label={spec.label}
        type="text"
        defaultValue={asText}
        description="true / false"
      />
    )
  }
  if (spec.type === 'date') {
    return (
      <TextField id={id} label={spec.label} type="date" defaultValue={asText} />
    )
  }
  return <TextField id={id} label={spec.label} defaultValue={asText} />
}
