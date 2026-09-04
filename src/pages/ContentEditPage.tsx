import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { AdminNav, ADMIN_NAV_ITEMS, filterNavItems } from '@/components/Nav'
import {
  Dialog,
  Notice,
  SelectField,
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
import { useAuth } from '@/lib/auth/AuthProvider'
import { entityLabel } from '@/pages/ContentListPage'

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
    return (
      <TextField
        id={id}
        label={spec.label}
        defaultValue={asText}
        disabled
        description="Media library workflow pending (ADMIN-180) — read-only here."
      />
    )
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
  const busy = create.isPending || update.isPending || transition.isPending

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
      if (spec.type === 'media') continue
      const raw = form.get(`field-${spec.key}`)
      if (raw === null) continue
      if (spec.type === 'number') {
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
    </main>
  )
}
