import { useState } from 'react'
import { Notice } from '@/components/ui/primitives'
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
import { useUpdateContent } from '@/lib/api/hooks/useContent'

/** Generic structured-metadata save section for the PU-10 family editors.
 * Each family packet renders its own `*-fields` component through this shell:
 * values stay local until Save, then go through the existing content update
 * with `If-Match`. Saved/published stays on the server `status`; validation
 * and 409 conflicts surface visibly without touching the metadata, story, or
 * revision workflow. */
export function FamilyEditorSection({
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

type FamilyControls = {
  values: Record<string, unknown>
  setField: (key: string, value: unknown) => void
  saving: boolean
}

/** One entry per content family that has a structured-metadata editor.
 * `keyPrefix` keeps each section's React key (and so its local draft reset
 * on every server `updatedAt`) exactly as before the split. */
const FAMILY_EDITORS: Record<
  string,
  {
    title: string
    keyPrefix: string
    render: (entity: string, controls: FamilyControls) => React.ReactNode
  }
> = {
  'research-topic': {
    title: 'Research details',
    keyPrefix: 'research',
    render: (entity, { values, setField, saving }) => (
      <ResearchFields
        entity={entity as 'research-topic' | 'research-statement'}
        fields={values}
        onChange={setField}
        disabled={saving}
      />
    ),
  },
  'research-statement': {
    title: 'Research details',
    keyPrefix: 'research',
    render: (entity, { values, setField, saving }) => (
      <ResearchFields
        entity={entity as 'research-topic' | 'research-statement'}
        fields={values}
        onChange={setField}
        disabled={saving}
      />
    ),
  },
  publication: {
    title: 'Publication details',
    keyPrefix: 'publication',
    render: (_entity, { values, setField, saving }) => (
      <PublicationFields
        fields={values}
        onChange={setField}
        disabled={saving}
      />
    ),
  },
  project: {
    title: 'Project details',
    keyPrefix: 'project',
    render: (_entity, { values, setField, saving }) => (
      <ProjectFields fields={values} onChange={setField} disabled={saving} />
    ),
  },
  article: {
    title: 'Article details',
    keyPrefix: 'article',
    render: (_entity, { values, setField, saving }) => (
      <ArticleFields fields={values} onChange={setField} disabled={saving} />
    ),
  },
  course: {
    title: 'Course details',
    keyPrefix: 'course',
    render: (_entity, { values, setField, saving }) => (
      <CourseFields fields={values} onChange={setField} disabled={saving} />
    ),
  },
  lesson: {
    title: 'Lesson details',
    keyPrefix: 'lesson',
    render: (_entity, { values, setField, saving }) => (
      <LessonFields fields={values} onChange={setField} disabled={saving} />
    ),
  },
  'creative-work': {
    title: 'Creative-work details',
    keyPrefix: 'creative',
    render: (_entity, { values, setField, saving }) => (
      <CreativeFields fields={values} onChange={setField} disabled={saving} />
    ),
  },
  book: {
    title: 'Book details',
    keyPrefix: 'book',
    render: (_entity, { values, setField, saving }) => (
      <BookFields fields={values} onChange={setField} disabled={saving} />
    ),
  },
  talk: {
    title: 'Talk details',
    keyPrefix: 'talk',
    render: (_entity, { values, setField, saving }) => (
      <TalkFields fields={values} onChange={setField} disabled={saving} />
    ),
  },
  download: {
    title: 'Download details',
    keyPrefix: 'download',
    render: (_entity, { values, setField, saving }) => (
      <ResourceFields fields={values} onChange={setField} disabled={saving} />
    ),
  },
  collection: {
    title: 'Collection details',
    keyPrefix: 'collection',
    render: (_entity, { values, setField, saving }) => (
      <CollectionFields fields={values} onChange={setField} disabled={saving} />
    ),
  },
  series: {
    title: 'Series details',
    keyPrefix: 'series',
    render: (_entity, { values, setField, saving }) => (
      <SeriesFields fields={values} onChange={setField} disabled={saving} />
    ),
  },
  profile: {
    title: 'Profile details',
    keyPrefix: 'profile',
    render: (_entity, { values, setField, saving }) => (
      <ProfileFields fields={values} onChange={setField} disabled={saving} />
    ),
  },
}

/** The family-specific details editor for `entity`, or nothing when the
 * family has none (e.g. landings). */
export function FamilyEditor({
  entity,
  content,
  onSaved,
}: {
  entity: string
  content: { id: number; updatedAt: string; fields?: Record<string, unknown> }
  onSaved: () => void
}) {
  const editor = FAMILY_EDITORS[entity]
  if (!editor) return null
  return (
    <FamilyEditorSection
      key={`${editor.keyPrefix}-${content.id}-${content.updatedAt}`}
      entity={entity}
      title={editor.title}
      contentId={content.id}
      ifMatch={content.updatedAt}
      initialFields={{ ...(content.fields ?? {}) }}
      onSaved={onSaved}
    >
      {(controls) => editor.render(entity, controls)}
    </FamilyEditorSection>
  )
}
