import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  Notice,
  SelectField,
  TextField,
  ValidationSummary,
  type ValidationIssue,
} from '@/components/ui/primitives'
import { LoadingState } from '@/components/ui/states'
import { AdminApiError } from '@/lib/api/auth'
import { entitySupportsStory } from '@/lib/api/content'
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
import { entitySupportsPreview } from '@/lib/api/preview'
import { FamilyEditor } from '@/pages/content-edit/FamilyEditorSection'
import { HistorySection } from '@/pages/content-edit/HistorySection'
import { LifecycleSection } from '@/pages/content-edit/LifecycleSection'
import { PreviewLinkSection } from '@/pages/content-edit/PreviewLinkSection'
import {
  metadataStatusOptions,
  SchemaField,
} from '@/pages/content-edit/SchemaField'
import { StorySection } from '@/pages/content-edit/StorySection'
import { entityLabel } from '@/pages/ContentListPage'

/** Content create/edit (ADMIN-160/170). Create POSTs once; edit PUTs with
 * If-Match updatedAt. Lifecycle transitions always go through the dedicated
 * transition operation with a confirmation dialog for publish. The server
 * remains the only authority on allowed transitions. Sections live in
 * `pages/content-edit/`. */
export function ContentEditPage({ entity }: { entity: string }) {
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

  const data = isEdit && detail.isSuccess ? detail.data : undefined
  const entityFields = schema.data?.entities[entity]?.fields ?? []
  const approvalBlocked =
    data?.approvalState != null && data.approvalState !== 'approved'
  const revisions = useContentRevisions(entity, idFromRoute ?? 0)
  const createRevision = useCreateContentRevision(entity, idFromRoute ?? 0)
  const restoreRevision = useRestoreContentRevision(entity, idFromRoute ?? 0)
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
    } catch (error) {
      setActionError(
        error instanceof AdminApiError
          ? error.message
          : 'Transition failed. Try again.',
      )
    }
  }

  const noun = entityLabel(entity).replace(/s$/, '').toLowerCase()

  return (
    <main className="page" dir={data?.locale === 'fa' ? 'rtl' : 'ltr'}>
      <p className="mb-2">
        <Link to={`/content/${entity}`} className="admin-small no-underline">
          ← {entityLabel(entity)}
        </Link>
      </p>
      <h1>{isEdit ? `Edit ${noun}` : `New ${noun}`}</h1>

      {isEdit && detail.isPending ? (
        <LoadingState label="Loading…" variant="form" rows={5} />
      ) : null}
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
        <p className="admin-meta">
          Status:{' '}
          <strong className={`badge badge--${data.status}`}>
            {data.status}
          </strong>
          {data.publishedAt ? ` · published ${data.publishedAt}` : ''}
          {data.approvalState ? ` · approval: ${data.approvalState}` : ''}
        </p>
      ) : null}

      <div className="grid items-start gap-x-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0">
          {(!isEdit || data) && (
            <form
              noValidate
              className="admin-panel"
              onSubmit={(event) => void handleSubmit(event)}
            >
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
                options={metadataStatusOptions(data?.status)}
              />

              {entityFields.map((spec) => (
                <SchemaField
                  key={spec.key}
                  spec={spec}
                  value={data?.fields[spec.key]}
                />
              ))}

              <p className="m-0">
                <button type="submit" className="admin-button" disabled={busy}>
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </p>
            </form>
          )}

          {isEdit && data && entitySupportsStory(entity) ? (
            <StorySection
              entity={entity}
              contentId={data.id}
              contentLocale={data.locale}
              contentUpdatedAt={data.updatedAt}
              currentStoryId={
                typeof data.fields?.storyId === 'number'
                  ? (data.fields.storyId as number)
                  : null
              }
              onChanged={() => void detail.refetch()}
            />
          ) : null}

          {isEdit && data ? (
            <FamilyEditor
              entity={entity}
              content={data}
              onSaved={() => void detail.refetch()}
            />
          ) : null}
        </div>

        {isEdit && data ? (
          <aside className="min-w-0" aria-label="Publishing and history">
            <LifecycleSection
              busy={busy}
              approvalBlocked={approvalBlocked}
              onTransition={runTransition}
            />
            {entitySupportsPreview(entity) ? (
              <PreviewLinkSection entity={entity} contentId={data.id} />
            ) : null}
            <HistorySection
              busy={busy}
              revisions={revisions}
              createRevision={createRevision}
              restoreRevision={restoreRevision}
            />
          </aside>
        ) : null}
      </div>
    </main>
  )
}
