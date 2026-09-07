import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

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
import { StoryEditor } from '@/components/editor/StoryEditor'
import { ArticleFields } from '@/components/editor/article-fields'
import { BookFields } from '@/components/editor/book-fields'
import { CollectionFields } from '@/components/editor/collection-fields'
import { CourseFields } from '@/components/editor/course-fields'
import { CreativeFields } from '@/components/editor/creative-fields'
import { LessonFields } from '@/components/editor/lesson-fields'
import { ProfileFields } from '@/components/editor/profile-fields'
import { ProjectFields } from '@/components/editor/project-fields'
import { PublicationFields } from '@/components/editor/publication-fields'
import { ResearchFields } from '@/components/editor/research-fields'
import { ResourceFields } from '@/components/editor/resource-fields'
import { SeriesFields } from '@/components/editor/series-fields'
import { TalkFields } from '@/components/editor/talk-fields'
import { AdminApiError } from '@/lib/api/auth'
import {
  CONTENT_STATUSES,
  entitySupportsStory,
  type ContentFieldSpecOut,
} from '@/lib/api/content'
import {
  fetchCompositionDetail,
  fetchCompositionSchema,
  type CompositionSectionUpdateIn,
} from '@/lib/api/composition'
import {
  useCompositionDetail,
  useUpdateComposition,
} from '@/lib/api/hooks/useComposition'
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
import {
  entitySupportsPreview,
  createPreviewLink,
  type PreviewLinkOut,
} from '@/lib/api/preview'
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

/** Story selection/edit/preview for story-bearing entities (PU-09-host).
 * Attaching writes `fields.storyId` through the existing content update with
 * `If-Match`; the backend owns kind (`story` only) and exact-locale checks.
 * Block editing reuses the PU-09-editor `StoryEditor` against the
 * PU-09-transport composition adapters. Existing metadata and revision
 * workflow above is untouched. */
function StorySection({
  entity,
  contentId,
  contentLocale,
  contentUpdatedAt,
  currentStoryId,
  onChanged,
}: {
  entity: string
  contentId: number
  contentLocale: string
  contentUpdatedAt: string
  currentStoryId: number | null
  onChanged: () => void
}) {
  const update = useUpdateContent(entity)
  const [input, setInput] = useState(
    currentStoryId ? String(currentStoryId) : '',
  )
  const [notice, setNotice] = useState<{
    tone: 'success' | 'error'
    text: string
  } | null>(null)
  const [attaching, setAttaching] = useState(false)

  async function handleAttach(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)
    const parsed = Number(input.trim())
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setNotice({ tone: 'error', text: 'Enter a story id (positive integer).' })
      return
    }
    setAttaching(true)
    try {
      const story = await fetchCompositionDetail(parsed)
      if (story.kind !== 'story') {
        setNotice({
          tone: 'error',
          text: `Composition ${parsed} is a “${story.kind}” page, not a story.`,
        })
        return
      }
      if (story.locale !== contentLocale) {
        setNotice({
          tone: 'error',
          text: `Story locale “${story.locale}” must match the content locale “${contentLocale}”.`,
        })
        return
      }
      await update.mutateAsync({
        id: contentId,
        payload: { fields: { storyId: parsed } },
        ifMatch: contentUpdatedAt,
      })
      setNotice({ tone: 'success', text: `Story ${parsed} attached.` })
      onChanged()
    } catch (error) {
      setNotice({
        tone: 'error',
        text:
          error instanceof AdminApiError
            ? error.kind === 'conflict'
              ? 'Changed elsewhere — reload and try again.'
              : error.message
            : 'Attaching the story failed. Try again.',
      })
    } finally {
      setAttaching(false)
    }
  }

  async function handleDetach() {
    setNotice(null)
    setAttaching(true)
    try {
      await update.mutateAsync({
        id: contentId,
        payload: { fields: { storyId: null } },
        ifMatch: contentUpdatedAt,
      })
      setInput('')
      setNotice({ tone: 'success', text: 'Story detached.' })
      onChanged()
    } catch (error) {
      setNotice({
        tone: 'error',
        text:
          error instanceof AdminApiError
            ? error.kind === 'conflict'
              ? 'Changed elsewhere — reload and try again.'
              : error.message
            : 'Detaching the story failed. Try again.',
      })
    } finally {
      setAttaching(false)
    }
  }

  return (
    <section aria-labelledby="story-section-title">
      <h2 id="story-section-title">Story</h2>
      {notice ? (
        <Notice
          tone={notice.tone === 'error' ? 'error' : 'success'}
          title={
            notice.tone === 'error' ? 'Story action failed' : 'Story updated'
          }
        >
          {notice.text}
        </Notice>
      ) : null}
      {currentStoryId === null ? (
        <p className="muted">
          No story attached. Attach a story-kind composition in “{contentLocale}
          ”.
        </p>
      ) : (
        <StoryAttachedEditor
          key={currentStoryId}
          storyId={currentStoryId}
          onDetached={handleDetach}
          detaching={attaching}
        />
      )}
      <form onSubmit={(event) => void handleAttach(event)}>
        <TextField
          id="story-id"
          label="Story id"
          type="text"
          value={input}
          onChange={setInput}
          description="Numeric id of a story-kind composition with the same locale."
        />
        <p>
          <button
            type="submit"
            className="admin-button admin-button--secondary"
            disabled={attaching || update.isPending}
          >
            {attaching ? 'Attaching…' : 'Attach story'}
          </button>
        </p>
      </form>
    </section>
  )
}

function StoryAttachedEditor({
  storyId,
  onDetached,
  detaching,
}: {
  storyId: number
  onDetached: () => void
  detaching: boolean
}) {
  const detail = useCompositionDetail(storyId)
  const schema = useQuery({
    queryKey: ['composition', 'schema', 'story'],
    queryFn: () => fetchCompositionSchema('story'),
  })
  const save = useUpdateComposition(storyId)
  const [sections, setSections] = useState<CompositionSectionUpdateIn[] | null>(
    null,
  )
  const [editing, setEditing] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [conflictDetail, setConflictDetail] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const page = detail.data
  const draft =
    sections ??
    (page?.sections ?? []).map((section) => ({
      layout: section.layout,
      ratio: section.ratio,
      enabled: section.enabled,
      blocks: (section.blocks ?? []).map((block) => ({
        blockType: block.blockType,
        enabled: block.enabled,
        settings: { ...(block.settings ?? {}) },
      })),
    })) ??
    []

  async function handleSave() {
    if (!page) return
    setConflictDetail(null)
    setServerError(null)
    try {
      const updated = await save.mutateAsync({
        payload: { sections: draft },
        ifMatch: page.updatedAt,
      })
      setSections(
        (updated.sections ?? []).map((section) => ({
          layout: section.layout,
          ratio: section.ratio,
          enabled: section.enabled,
          blocks: (section.blocks ?? []).map((block) => ({
            blockType: block.blockType,
            enabled: block.enabled,
            settings: { ...(block.settings ?? {}) },
          })),
        })),
      )
      setDirty(false)
    } catch (error) {
      if (error instanceof AdminApiError && error.kind === 'conflict') {
        setConflictDetail(error.message)
        return
      }
      setServerError(
        error instanceof AdminApiError
          ? error.message
          : 'Saving the story failed. Try again.',
      )
    }
  }

  async function handleResolve(choice: 'mine' | 'theirs') {
    if (choice === 'theirs' || !page) {
      const refetched = await detail.refetch()
      const fresh = refetched.data
      if (fresh) {
        setSections(
          (fresh.sections ?? []).map((section) => ({
            layout: section.layout,
            ratio: section.ratio,
            enabled: section.enabled,
            blocks: (section.blocks ?? []).map((block) => ({
              blockType: block.blockType,
              enabled: block.enabled,
              settings: { ...(block.settings ?? {}) },
            })),
          })),
        )
      } else {
        setSections(null)
      }
      setDirty(false)
      setConflictDetail(null)
      return
    }
    setConflictDetail(null)
    const refetched = await detail.refetch()
    const fresh = refetched.data
    if (!fresh) {
      setServerError('The story is no longer available. Reload the page.')
      return
    }
    try {
      const updated = await save.mutateAsync({
        payload: { sections: draft },
        ifMatch: fresh.updatedAt,
      })
      setSections(
        (updated.sections ?? []).map((section) => ({
          layout: section.layout,
          ratio: section.ratio,
          enabled: section.enabled,
          blocks: (section.blocks ?? []).map((block) => ({
            blockType: block.blockType,
            enabled: block.enabled,
            settings: { ...(block.settings ?? {}) },
          })),
        })),
      )
      setDirty(false)
    } catch (error) {
      if (error instanceof AdminApiError && error.kind === 'conflict') {
        setConflictDetail(error.message)
        return
      }
      setServerError(
        error instanceof AdminApiError
          ? error.message
          : 'Saving the story failed. Try again.',
      )
    }
  }

  if (detail.isPending) {
    return <p role="status">Loading attached story…</p>
  }
  if (detail.error || !page) {
    return (
      <Notice tone="error" title="Attached story unavailable">
        The story {storyId} did not answer.{' '}
        <button
          type="button"
          className="admin-button admin-button--secondary"
          onClick={() => void detail.refetch()}
        >
          Retry
        </button>
      </Notice>
    )
  }

  return (
    <div>
      <p>
        Attached story: <strong>{page.title}</strong> (id {page.id},{' '}
        {page.locale}, {page.status}
        {page.publishedAt ? `, published ${page.publishedAt}` : ''})
      </p>
      <p>
        <button
          type="button"
          className="admin-button admin-button--secondary"
          onClick={() => setEditing((value) => !value)}
        >
          {editing ? 'Hide block editor' : 'Edit blocks'}
        </button>{' '}
        <button
          type="button"
          className="admin-button admin-button--secondary"
          disabled={detaching}
          onClick={onDetached}
        >
          Detach story
        </button>
      </p>
      {editing ? (
        <StoryEditor
          page={page}
          schema={schema.data ?? null}
          sections={draft}
          onChange={(next) => {
            setSections(next)
            setDirty(true)
          }}
          onSave={() => void handleSave()}
          saveState={
            save.isPending
              ? 'saving'
              : conflictDetail
                ? 'conflict'
                : serverError
                  ? 'error'
                  : !dirty
                    ? 'saved'
                    : 'idle'
          }
          autosaveState={dirty ? 'dirty' : 'idle'}
          conflictDetail={conflictDetail}
          serverError={serverError}
          onResolveConflict={(choice) => void handleResolve(choice)}
        />
      ) : null}
    </div>
  )
}

/** Generic structured-metadata save section for the PU-10 family editors.
 * Each family packet renders its own `*-fields` component through this shell:
 * values stay local until Save, then go through the existing content update
 * with `If-Match`. Saved/published stays on the server `status`; validation
 * and 409 conflicts surface visibly without touching the metadata, story, or
 * revision workflow. */
function FamilyEditorSection({
  entity,
  title,
  contentId,
  ifMatch,
  initialFields,
  onSaved,
  children,
}: {
  entity: string
  title: string
  contentId: number
  ifMatch: string
  initialFields: Record<string, unknown>
  onSaved: () => void
  children: (controls: {
    values: Record<string, unknown>
    setField: (key: string, value: unknown) => void
    saving: boolean
  }) => React.ReactNode
}) {
  const update = useUpdateContent(entity)
  const [values, setValues] = useState<Record<string, unknown>>(initialFields)
  const [notice, setNotice] = useState<{
    tone: 'success' | 'error'
    text: string
  } | null>(null)

  function setField(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setNotice(null)
    try {
      await update.mutateAsync({
        id: contentId,
        payload: { fields: values },
        ifMatch,
      })
      setNotice({ tone: 'success', text: 'Saved.' })
      onSaved()
    } catch (error) {
      setNotice({
        tone: 'error',
        text:
          error instanceof AdminApiError
            ? error.kind === 'conflict'
              ? 'Changed elsewhere — reload and try again.'
              : error.message
            : 'Saving failed. Try again.',
      })
    }
  }

  const saving = update.isPending
  return (
    <section aria-label={title}>
      <h2>{title}</h2>
      {notice ? (
        <Notice
          tone={notice.tone === 'error' ? 'error' : 'success'}
          title={notice.tone === 'error' ? 'Save failed' : 'Saved'}
        >
          {notice.text}
        </Notice>
      ) : null}
      {children({ values, setField, saving })}
      <p>
        <button
          type="button"
          className="admin-button admin-button--secondary"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? 'Saving…' : `Save ${title.toLowerCase()}`}
        </button>
      </p>
    </section>
  )
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
  const approvalBlocked =
    data?.approvalState != null && data.approvalState !== 'approved'
  const revisions = useContentRevisions(entity, idFromRoute ?? 0)
  const createRevision = useCreateContentRevision(entity, idFromRoute ?? 0)
  const restoreRevision = useRestoreContentRevision(entity, idFromRoute ?? 0)
  const [snapshotNote, setSnapshotNote] = useState('')
  const [restoreTarget, setRestoreTarget] = useState<number | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [previewLink, setPreviewLink] = useState<PreviewLinkOut | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [creatingPreview, setCreatingPreview] = useState(false)
  const [confirmSchedule, setConfirmSchedule] = useState(false)
  const [scheduledFor, setScheduledFor] = useState('')
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

  async function handleCreatePreviewLink() {
    if (!data) return
    setPreviewError(null)
    setCreatingPreview(true)
    try {
      setPreviewLink(await createPreviewLink(entity, data.id))
    } catch (error) {
      setPreviewLink(null)
      setPreviewError(
        error instanceof AdminApiError
          ? error.message
          : 'Creating the preview link failed. Try again.',
      )
    } finally {
      setCreatingPreview(false)
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
          {data.approvalState ? ` · approval: ${data.approvalState}` : ''}
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

      {isEdit &&
      data &&
      (entity === 'research-topic' || entity === 'research-statement') ? (
        <FamilyEditorSection
          key={`research-${data.id}-${data.updatedAt}`}
          entity={entity}
          title="Research details"
          contentId={data.id}
          ifMatch={data.updatedAt}
          initialFields={{ ...(data.fields ?? {}) }}
          onSaved={() => void detail.refetch()}
        >
          {({ values, setField, saving }) => (
            <ResearchFields
              entity={entity as 'research-topic' | 'research-statement'}
              fields={values}
              onChange={setField}
              disabled={saving}
            />
          )}
        </FamilyEditorSection>
      ) : null}

      {isEdit && data && entity === 'publication' ? (
        <FamilyEditorSection
          key={`publication-${data.id}-${data.updatedAt}`}
          entity={entity}
          title="Publication details"
          contentId={data.id}
          ifMatch={data.updatedAt}
          initialFields={{ ...(data.fields ?? {}) }}
          onSaved={() => void detail.refetch()}
        >
          {({ values, setField, saving }) => (
            <PublicationFields
              fields={values}
              onChange={setField}
              disabled={saving}
            />
          )}
        </FamilyEditorSection>
      ) : null}

      {isEdit && data && entity === 'project' ? (
        <FamilyEditorSection
          key={`project-${data.id}-${data.updatedAt}`}
          entity={entity}
          title="Project details"
          contentId={data.id}
          ifMatch={data.updatedAt}
          initialFields={{ ...(data.fields ?? {}) }}
          onSaved={() => void detail.refetch()}
        >
          {({ values, setField, saving }) => (
            <ProjectFields
              fields={values}
              onChange={setField}
              disabled={saving}
            />
          )}
        </FamilyEditorSection>
      ) : null}

      {isEdit && data && entity === 'article' ? (
        <FamilyEditorSection
          key={`article-${data.id}-${data.updatedAt}`}
          entity={entity}
          title="Article details"
          contentId={data.id}
          ifMatch={data.updatedAt}
          initialFields={{ ...(data.fields ?? {}) }}
          onSaved={() => void detail.refetch()}
        >
          {({ values, setField, saving }) => (
            <ArticleFields
              fields={values}
              onChange={setField}
              disabled={saving}
            />
          )}
        </FamilyEditorSection>
      ) : null}

      {isEdit && data && entity === 'course' ? (
        <FamilyEditorSection
          key={`course-${data.id}-${data.updatedAt}`}
          entity={entity}
          title="Course details"
          contentId={data.id}
          ifMatch={data.updatedAt}
          initialFields={{ ...(data.fields ?? {}) }}
          onSaved={() => void detail.refetch()}
        >
          {({ values, setField, saving }) => (
            <CourseFields
              fields={values}
              onChange={setField}
              disabled={saving}
            />
          )}
        </FamilyEditorSection>
      ) : null}

      {isEdit && data && entity === 'lesson' ? (
        <FamilyEditorSection
          key={`lesson-${data.id}-${data.updatedAt}`}
          entity={entity}
          title="Lesson details"
          contentId={data.id}
          ifMatch={data.updatedAt}
          initialFields={{ ...(data.fields ?? {}) }}
          onSaved={() => void detail.refetch()}
        >
          {({ values, setField, saving }) => (
            <LessonFields
              fields={values}
              onChange={setField}
              disabled={saving}
            />
          )}
        </FamilyEditorSection>
      ) : null}

      {isEdit && data && entity === 'creative-work' ? (
        <FamilyEditorSection
          key={`creative-${data.id}-${data.updatedAt}`}
          entity={entity}
          title="Creative-work details"
          contentId={data.id}
          ifMatch={data.updatedAt}
          initialFields={{ ...(data.fields ?? {}) }}
          onSaved={() => void detail.refetch()}
        >
          {({ values, setField, saving }) => (
            <CreativeFields
              fields={values}
              onChange={setField}
              disabled={saving}
            />
          )}
        </FamilyEditorSection>
      ) : null}

      {isEdit && data && entity === 'book' ? (
        <FamilyEditorSection
          key={`book-${data.id}-${data.updatedAt}`}
          entity={entity}
          title="Book details"
          contentId={data.id}
          ifMatch={data.updatedAt}
          initialFields={{ ...(data.fields ?? {}) }}
          onSaved={() => void detail.refetch()}
        >
          {({ values, setField, saving }) => (
            <BookFields fields={values} onChange={setField} disabled={saving} />
          )}
        </FamilyEditorSection>
      ) : null}

      {isEdit && data && entity === 'talk' ? (
        <FamilyEditorSection
          key={`talk-${data.id}-${data.updatedAt}`}
          entity={entity}
          title="Talk details"
          contentId={data.id}
          ifMatch={data.updatedAt}
          initialFields={{ ...(data.fields ?? {}) }}
          onSaved={() => void detail.refetch()}
        >
          {({ values, setField, saving }) => (
            <TalkFields fields={values} onChange={setField} disabled={saving} />
          )}
        </FamilyEditorSection>
      ) : null}

      {isEdit && data && entity === 'download' ? (
        <FamilyEditorSection
          key={`download-${data.id}-${data.updatedAt}`}
          entity={entity}
          title="Download details"
          contentId={data.id}
          ifMatch={data.updatedAt}
          initialFields={{ ...(data.fields ?? {}) }}
          onSaved={() => void detail.refetch()}
        >
          {({ values, setField, saving }) => (
            <ResourceFields
              fields={values}
              onChange={setField}
              disabled={saving}
            />
          )}
        </FamilyEditorSection>
      ) : null}

      {isEdit && data && entity === 'collection' ? (
        <FamilyEditorSection
          key={`collection-${data.id}-${data.updatedAt}`}
          entity={entity}
          title="Collection details"
          contentId={data.id}
          ifMatch={data.updatedAt}
          initialFields={{ ...(data.fields ?? {}) }}
          onSaved={() => void detail.refetch()}
        >
          {({ values, setField, saving }) => (
            <CollectionFields
              fields={values}
              onChange={setField}
              disabled={saving}
            />
          )}
        </FamilyEditorSection>
      ) : null}

      {isEdit && data && entity === 'series' ? (
        <FamilyEditorSection
          key={`series-${data.id}-${data.updatedAt}`}
          entity={entity}
          title="Series details"
          contentId={data.id}
          ifMatch={data.updatedAt}
          initialFields={{ ...(data.fields ?? {}) }}
          onSaved={() => void detail.refetch()}
        >
          {({ values, setField, saving }) => (
            <SeriesFields
              fields={values}
              onChange={setField}
              disabled={saving}
            />
          )}
        </FamilyEditorSection>
      ) : null}

      {isEdit && data && entity === 'profile' ? (
        <FamilyEditorSection
          key={`profile-${data.id}-${data.updatedAt}`}
          entity={entity}
          title="Profile details"
          contentId={data.id}
          ifMatch={data.updatedAt}
          initialFields={{ ...(data.fields ?? {}) }}
          onSaved={() => void detail.refetch()}
        >
          {({ values, setField, saving }) => (
            <ProfileFields
              fields={values}
              onChange={setField}
              disabled={saving}
            />
          )}
        </FamilyEditorSection>
      ) : null}

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
            {approvalBlocked ? (
              <Notice tone="warning" title="Owner approval required">
                The seed record for this content has not been approved by the
                owner yet; publish is blocked until then (server-enforced).
              </Notice>
            ) : null}
            <button
              type="button"
              className="admin-button"
              disabled={busy || approvalBlocked}
              onClick={() => setConfirmPublish(true)}
            >
              Publish
            </button>
            <button
              type="button"
              className="admin-button admin-button--secondary"
              disabled={busy}
              onClick={() => setConfirmSchedule(true)}
            >
              Schedule
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

      {isEdit && data && entitySupportsPreview(entity) ? (
        <section aria-labelledby="share-title">
          <h2 id="share-title">Share preview</h2>
          <p className="muted">
            Short-lived public link to the draft; it expires automatically.
          </p>
          {previewError ? (
            <Notice tone="error" title="Preview link failed">
              {previewError}
            </Notice>
          ) : null}
          {previewLink ? (
            <div>
              <p>
                <a href={previewLink.url}>{previewLink.url}</a>
              </p>
              <p className="muted">Expires {previewLink.expiresAt}</p>
            </div>
          ) : null}
          <button
            type="button"
            className="admin-button admin-button--secondary"
            disabled={creatingPreview}
            onClick={() => void handleCreatePreviewLink()}
          >
            {creatingPreview ? 'Creating…' : 'Create preview link'}
          </button>
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
        title="Schedule publication"
        open={confirmSchedule}
        onClose={() => setConfirmSchedule(false)}
      >
        <TextField
          id="schedule-at"
          label="Publish at"
          type="datetime-local"
          value={scheduledFor}
          onChange={setScheduledFor}
        />
        <button
          type="button"
          className="admin-button"
          disabled={busy || !scheduledFor}
          onClick={() =>
            void runTransition(
              'scheduled',
              scheduledFor ? new Date(scheduledFor).toISOString() : null,
            )
          }
        >
          Confirm schedule
        </button>
      </Dialog>

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
