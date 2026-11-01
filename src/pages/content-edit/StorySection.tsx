import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Notice, TextField } from '@/components/ui/primitives'
import { StoryEditor } from '@/components/editor/StoryEditor'
import { AdminApiError } from '@/lib/api/auth'
import {
  fetchCompositionDetail,
  fetchCompositionSchema,
  type CompositionSectionUpdateIn,
} from '@/lib/api/composition'
import {
  useCompositionDetail,
  useUpdateComposition,
} from '@/lib/api/hooks/useComposition'
import { useUpdateContent } from '@/lib/api/hooks/useContent'
import { LoadingState } from '@/components/ui/states'

/** Story selection/edit/preview for story-bearing entities (PU-09-host).
 * Attaching writes `fields.storyId` through the existing content update with
 * `If-Match`; the backend owns kind (`story` only) and exact-locale checks.
 * Block editing reuses the PU-09-editor `StoryEditor` against the
 * PU-09-transport composition adapters. Existing metadata and revision
 * workflow above is untouched. */
export function StorySection({
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
  const [autosaveOutcome, setAutosaveOutcome] = useState<'idle' | 'saved'>(
    'idle',
  )
  const [conflictDetail, setConflictDetail] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const editGeneration = useRef(0)

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

  function storyPayload(sectionsToSave: CompositionSectionUpdateIn[]) {
    if (page?.status === 'published') {
      return { sections: sectionsToSave, status: 'draft' as const }
    }
    return { sections: sectionsToSave }
  }

  async function handleSave() {
    if (!page) return
    const generation = editGeneration.current
    const sectionsToSave = draft
    setConflictDetail(null)
    setServerError(null)
    try {
      const updated = await save.mutateAsync({
        payload: storyPayload(sectionsToSave),
        ifMatch: page.updatedAt,
      })
      if (editGeneration.current !== generation) {
        return
      }
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
      setAutosaveOutcome('saved')
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
      setAutosaveOutcome('idle')
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
        payload: storyPayload(draft),
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
      setAutosaveOutcome('saved')
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
    return <LoadingState label="Loading attached story…" variant="form" />
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
            editGeneration.current += 1
            setSections(next)
            setDirty(true)
            setAutosaveOutcome('idle')
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
          autosaveState={
            save.isPending
              ? 'saving'
              : dirty
                ? 'dirty'
                : autosaveOutcome === 'saved'
                  ? 'saved'
                  : 'idle'
          }
          conflictDetail={conflictDetail}
          serverError={serverError}
          onResolveConflict={(choice) => void handleResolve(choice)}
        />
      ) : null}
    </div>
  )
}
