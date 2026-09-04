import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { AdminNav, ADMIN_NAV_ITEMS, filterNavItems } from '@/components/Nav'
import {
  Dialog,
  Notice,
  SelectField,
  Table,
  TextareaField,
  TextField,
  ValidationSummary,
  type ValidationIssue,
} from '@/components/ui/primitives'
import { AdminApiError } from '@/lib/api/auth'
import { CONTENT_STATUSES, type ContentFieldSpecOut } from '@/lib/api/content'
import {
  useContentDetail,
  useContentSchema,
  useCreateContent,
  useTransitionContent,
  useUpdateContent,
} from '@/lib/api/hooks/useContent'
import {
  useContentRevisions,
  useCreateContentRevision,
  useRestoreContentRevision,
} from '@/lib/api/hooks/useContentRevisions'
import { useMediaList } from '@/lib/api/hooks/useMedia'
import { useAuth } from '@/lib/auth/AuthProvider'
import { entityLabel } from '@/pages/ContentListPage'

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

function SchemaField({
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

/** Content create/edit (ADMIN-160/170). Create POSTs once; edit PUTs with
 * If-Match updatedAt. Lifecycle transitions always go through the dedicated
 * transition operation with a confirmation dialog for publish. The server
 * remains the only authority on allowed transitions. */
export function ContentEditPage({ entity }: { entity: string }) {
  const { user } = useAuth()
  const params = useParams()
  const navigate = useNavigate()
  const idFromRoute = params.id ? Number(params.id) : undefined
  const isEdit = idFromRoute !== undefined && !Number.isNaN(idFromRoute)

  const detail = useContentDetail(entity, idFromRoute ?? 0)
  const schema = useContentSchema()
  const create = useCreateContent(entity)
  const update = useUpdateContent(entity)
  const transition = useTransitionContent(entity)

  const [issues, setIssues] = useState<ValidationIssue[]>([])
  const [conflict, setConflict] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [confirmPublish, setConfirmPublish] = useState(false)

  const data = isEdit && detail.isSuccess ? detail.data : undefined
  const entityFields = schema.data?.entities[entity]?.fields ?? []
  const revisions = useContentRevisions(entity, idFromRoute ?? 0)
  const createRevision = useCreateContentRevision(entity, idFromRoute ?? 0)
  const restoreRevision = useRestoreContentRevision(entity, idFromRoute ?? 0)
  const [snapshotNote, setSnapshotNote] = useState('')
  const [restoreTarget, setRestoreTarget] = useState<number | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const busy =
    create.isPending ||
    update.isPending ||
    transition.isPending ||
    createRevision.isPending ||
    restoreRevision.isPending

  function fieldIssuesFrom(error: AdminApiError): ValidationIssue[] {
    return Object.entries(error.fieldErrors).map(([field, message]) => ({
      field,
      message,
      targetId: field,
    }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIssues([])
    setConflict(false)
    setSaved(false)
    setActionError(null)

    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    const slug = String(form.get('slug') ?? '').trim()
    const locale = String(form.get('locale') ?? 'en')
    const status = String(form.get('status') ?? 'draft')

    const nextIssues: ValidationIssue[] = []
    if (!title) {
      nextIssues.push({
        field: 'title',
        message: 'Title is required.',
        targetId: 'title',
      })
    }
    if (!slug) {
      nextIssues.push({
        field: 'slug',
        message: 'Slug is required.',
        targetId: 'slug',
      })
    }
    if (nextIssues.length > 0) {
      setIssues(nextIssues)
      return
    }

    const fields: Record<string, unknown> = { ...(data?.fields ?? {}) }
    for (const spec of entityFields) {
      const raw = form.get(`field-${spec.key}`)
      if (raw === null) continue
      // Diff against the loaded value: untouched schema fields stay out of
      // the payload so explicit-null clears cannot wipe them by accident.
      const initial = String(data?.fields[spec.key] ?? '')
      if (String(raw) === initial) continue
      if (spec.type === 'media' || spec.type === 'number') {
        fields[spec.key] = raw === '' ? null : Number(raw)
      } else if (spec.type === 'boolean') {
        fields[spec.key] = raw === 'true'
      } else {
        fields[spec.key] = String(raw)
      }
    }

    try {
      if (isEdit && data) {
        await update.mutateAsync({
          id: data.id,
          payload: { title, slug, status, fields },
          ifMatch: data.updatedAt,
        })
        setSaved(true)
      } else {
        const created = await create.mutateAsync({
          title,
          slug,
          locale,
          status,
          fields,
        })
        void navigate(`/content/${entity}/${created.id}`)
      }
    } catch (error) {
      if (error instanceof AdminApiError && error.kind === 'conflict') {
        setConflict(true)
        return
      }
      if (error instanceof AdminApiError && error.kind === 'validation') {
        setIssues(fieldIssuesFrom(error))
        return
      }
      setIssues([
        {
          field: 'form',
          message:
            error instanceof AdminApiError
              ? error.message
              : 'Saving failed. Try again.',
          targetId: 'content-form-title',
        },
      ])
    }
  }

  async function runTransition(to: string, scheduledFor?: string | null) {
    if (!data) return
    setActionError(null)
    try {
      await transition.mutateAsync({ id: data.id, to, scheduledFor })
      setConfirmPublish(false)
    } catch (error) {
      setConfirmPublish(false)
      setActionError(
        error instanceof AdminApiError
          ? error.message
          : 'Transition failed. Try again.',
      )
    }
  }

  async function handleSnapshot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!data) return
    setHistoryError(null)
    try {
      await createRevision.mutateAsync({ note: snapshotNote.trim() || null })
      setSnapshotNote('')
    } catch (error) {
      setHistoryError(
        error instanceof AdminApiError
          ? error.message
          : 'Snapshot failed. Try again.',
      )
    }
  }

  async function handleRestore(revisionId: number) {
    setHistoryError(null)
    try {
      await restoreRevision.mutateAsync(revisionId)
      setRestoreTarget(null)
    } catch (error) {
      setRestoreTarget(null)
      setHistoryError(
        error instanceof AdminApiError
          ? error.message
          : 'Restore failed. Try again.',
      )
    }
  }

  return (
    <main className="page">
      <AdminNav items={filterNavItems(ADMIN_NAV_ITEMS, user)} />
      <p>
        <Link to={`/content/${entity}`}>← {entityLabel(entity)}</Link>
      </p>
      <h1>
        {isEdit
          ? `Edit ${entityLabel(entity).replace(/s$/, '').toLowerCase()}`
          : `New ${entityLabel(entity).replace(/s$/, '').toLowerCase()}`}
      </h1>

      {isEdit && detail.isPending ? <p role="status">Loading…</p> : null}
      {isEdit && detail.error ? (
        <Notice tone="error" title="Content unavailable">
          The backend did not answer.{' '}
          <button
            type="button"
            className="admin-button admin-button--secondary"
            onClick={() => void detail.refetch()}
          >
            Retry
          </button>
        </Notice>
      ) : null}
      {conflict ? (
        <Notice tone="error" title="Changed elsewhere">
          This record was updated after you loaded it. Your changes were not
          applied.{' '}
          <button
            type="button"
            className="admin-button admin-button--secondary"
            onClick={() => {
              setConflict(false)
              void detail.refetch()
            }}
          >
            Reload latest
          </button>
        </Notice>
      ) : null}
      {saved ? <Notice tone="success" title="Saved" /> : null}
      {actionError ? (
        <Notice tone="error" title="Action failed">
          {actionError}
        </Notice>
      ) : null}
      <ValidationSummary title="There is a problem" errors={issues} />

      {data ? (
        <p>
          Status: <strong>{data.status}</strong>
          {data.publishedAt ? ` · published ${data.publishedAt}` : ''}
        </p>
      ) : null}

      {(!isEdit || data) && (
        <form noValidate onSubmit={(event) => void handleSubmit(event)}>
          <TextField
            id="title"
            label="Title"
            defaultValue={data?.title}
            error={issues.find((issue) => issue.field === 'title')?.message}
          />
          <TextField
            id="slug"
            label="Slug"
            defaultValue={data?.slug}
            error={issues.find((issue) => issue.field === 'slug')?.message}
          />
          {isEdit ? (
            <p className="muted">
              Locale: <strong>{data?.locale}</strong> (fixed after creation)
            </p>
          ) : (
            <SelectField
              id="locale"
              label="Locale"
              defaultValue="en"
              options={[
                { value: 'en', label: 'English' },
                { value: 'fa', label: 'فارسی' },
              ]}
            />
          )}
          <SelectField
            id="status"
            label="Status"
            defaultValue={data?.status ?? 'draft'}
            options={CONTENT_STATUSES.map((value) => ({ value, label: value }))}
          />

          {entityFields.map((spec) => (
            <SchemaField
              key={spec.key}
              spec={spec}
              value={data?.fields[spec.key]}
            />
          ))}

          <p>
            <button type="submit" className="admin-button" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </p>
        </form>
      )}

      {isEdit && data ? (
        <section aria-labelledby="lifecycle-title">
          <h2 id="lifecycle-title">Lifecycle</h2>
          <p className="muted">
            Transitions are validated by the backend; failures are shown here.
          </p>
          <div className="admin-filter-bar">
            <button
              type="button"
              className="admin-button admin-button--secondary"
              disabled={busy}
              onClick={() => void runTransition('review')}
            >
              Submit for review
            </button>
            <button
              type="button"
              className="admin-button"
              disabled={busy}
              onClick={() => setConfirmPublish(true)}
            >
              Publish
            </button>
            <button
              type="button"
              className="admin-button admin-button--secondary"
              disabled={busy}
              onClick={() => void runTransition('archive')}
            >
              Archive
            </button>
          </div>
        </section>
      ) : null}

      {isEdit && data ? (
        <section aria-labelledby="history-title">
          <h2 id="history-title">History</h2>
          {historyError ? (
            <Notice tone="error" title="History action failed">
              {historyError}
            </Notice>
          ) : null}
          <form onSubmit={(event) => void handleSnapshot(event)}>
            <TextField
              id="snapshot-note"
              label="Snapshot note"
              value={snapshotNote}
              onChange={setSnapshotNote}
              description="Optional context stored with the immutable snapshot."
            />
            <p>
              <button
                type="submit"
                className="admin-button admin-button--secondary"
                disabled={busy}
              >
                Save snapshot
              </button>
            </p>
          </form>
          {revisions.isPending ? <p role="status">Loading history…</p> : null}
          {revisions.data ? (
            <Table
              caption="Revision history"
              columns={[
                { key: 'id', header: 'Revision' },
                { key: 'note', header: 'Note' },
                { key: 'createdAt', header: 'Created' },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (row) => (
                    <button
                      type="button"
                      className="admin-button admin-button--secondary"
                      disabled={busy}
                      onClick={() => setRestoreTarget(row.id)}
                    >
                      Restore revision {row.id}
                    </button>
                  ),
                },
              ]}
              rows={revisions.data.items}
              rowKey={(row) => row.id}
              emptyMessage="No revisions yet. Save a snapshot to create the first one."
            />
          ) : null}
        </section>
      ) : null}

      <Dialog
        title="Publish this content?"
        open={confirmPublish}
        onClose={() => setConfirmPublish(false)}
      >
        <p>Publishing makes this record visible on the public site.</p>
        <button
          type="button"
          className="admin-button"
          disabled={busy}
          onClick={() => void runTransition('published')}
        >
          Confirm publish
        </button>
      </Dialog>

      <Dialog
        title={`Restore revision ${restoreTarget ?? ''}?`}
        open={restoreTarget !== null}
        onClose={() => setRestoreTarget(null)}
      >
        <p>
          The backend restores this revision as a draft. The live published
          record is never overwritten; publish again from the draft if needed.
        </p>
        <button
          type="button"
          className="admin-button"
          disabled={busy}
          onClick={() => {
            if (restoreTarget !== null) void handleRestore(restoreTarget)
          }}
        >
          Confirm restore
        </button>
      </Dialog>
    </main>
  )
}
