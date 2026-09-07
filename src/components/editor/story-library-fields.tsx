import { useEffect, useState } from 'react'

import { fetchContentDetail, listContent } from '@/lib/api/content'
import { fetchMediaItem, fetchMediaList } from '@/lib/api/media'

// Backend ALLOWED_RELATED_FAMILIES mapped to admin ENTITY_MODELS names.
const RELATED_ENTITIES: Record<string, string> = {
  article: 'article',
  series: 'series',
  project: 'project',
  publication: 'publication',
  course: 'course',
  creativework: 'creative-work',
  lesson: 'lesson',
  book: 'book',
  talk: 'talk',
  download: 'download',
  collection: 'collection',
  researchtopic: 'research-topic',
  researchstatement: 'research-statement',
}

type Selection = { family: string; id: string }
type LibraryItem = { id: number; title: string; detail: string }

function SelectedRecord({
  item,
  onRemove,
  onMoveUp,
  index,
}: {
  item: Selection
  onRemove: () => void
  onMoveUp: () => void
  index: number
}) {
  const [loaded, setLoaded] = useState<{ key: string; title: string } | null>(
    null,
  )
  const key = `${item.family}:${item.id}`
  useEffect(() => {
    let current = true
    const request =
      item.family === 'media'
        ? fetchMediaItem(Number(item.id))
        : fetchContentDetail(
            RELATED_ENTITIES[item.family] ?? item.family,
            Number(item.id),
          )
    void request
      .then((record) => {
        if (current) setLoaded({ key, title: record.title })
      })
      .catch(() => {
        if (current)
          setLoaded({
            key,
            title: 'Selected item unavailable — remove or choose a replacement',
          })
      })
    return () => {
      current = false
    }
  }, [key, item.family, item.id])
  return (
    <li className="story-editor__row">
      <span>
        {loaded?.key === key ? loaded.title : 'Loading selected item…'}
      </span>
      <button
        type="button"
        onClick={onMoveUp}
        disabled={index === 0}
        aria-label={`Move selected item ${index + 1} up`}
      >
        ↑ Up
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove selected item ${index + 1}`}
      >
        Remove
      </button>
    </li>
  )
}

/** Search and pagination use the existing authenticated list APIs. Only an
 * explicit selection changes the draft; loading/errors never erase values. */
function LibrarySearch({
  inputId,
  entity,
  locale,
  mediaType,
  selected,
  onChoose,
}: {
  inputId: string
  entity: string
  locale: string
  mediaType?: string
  selected: Selection[]
  onChoose: (id: number) => void
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState<{
    key: string
    items: LibraryItem[]
    total: number
    error?: string
  } | null>(null)
  const key = `${entity}:${locale}:${mediaType}:${search}:${page}:${retry}`
  useEffect(() => {
    let current = true
    const request =
      entity === 'media'
        ? fetchMediaList({
            q: search,
            page,
            pageSize: 20,
            type: mediaType,
            active: 'true',
          }).then((data) => ({
            items: data.items.map((item) => ({
              id: item.id,
              title: item.title,
              detail: item.mime,
            })),
            total: data.total,
          }))
        : listContent(RELATED_ENTITIES[entity] ?? entity, {
            q: search,
            locale,
            page,
            pageSize: 20,
          }).then((data) => ({
            items: data.items.map((item) => ({
              id: item.id,
              title: item.title,
              detail: item.status,
            })),
            total: data.total,
          }))
    void request
      .then((data) => {
        if (current) setResult({ key, ...data })
      })
      .catch(() => {
        if (current)
          setResult({
            key,
            items: [],
            total: 0,
            error: 'Library unavailable. Your selections are preserved.',
          })
      })
    return () => {
      current = false
    }
  }, [key, entity, locale, mediaType, search, page])
  const current = result?.key === key ? result : null
  return (
    <div className="story-editor__library">
      <label htmlFor={inputId}>
        {entity === 'media' ? 'Search media library' : 'Search content'}
      </label>
      <input
        id={inputId}
        type="search"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value)
          setPage(1)
        }}
      />
      {!current ? (
        <p role="status">Loading library…</p>
      ) : current.error ? (
        <p role="alert">
          {current.error}{' '}
          <button type="button" onClick={() => setRetry(retry + 1)}>
            Retry library
          </button>
        </p>
      ) : (
        <>
          {current.items.length === 0 ? (
            <p>No matching items.</p>
          ) : (
            <ul className="story-editor__list">
              {current.items.map((item) => (
                <li key={item.id} className="story-editor__row">
                  <span>
                    {item.title} <small>({item.detail})</small>
                  </span>
                  <button
                    type="button"
                    aria-label={`Choose ${item.title}`}
                    disabled={selected.some(
                      (value) =>
                        value.family === entity && value.id === String(item.id),
                    )}
                    onClick={() => onChoose(item.id)}
                  >
                    Choose
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="story-editor__row">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous results
            </button>
            <span>Page {page}</span>
            <button
              type="button"
              disabled={!(page * 20 < current.total)}
              onClick={() => setPage(page + 1)}
            >
              Next results
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function StoryLibraryField({
  inputId,
  value,
  onChange,
  locale,
  kind,
  mediaType,
}: {
  inputId: string
  value: unknown
  onChange: (value: unknown) => void
  locale: string
  kind: 'media' | 'mediaList' | 'download' | 'relatedList'
  mediaType?: string
}) {
  const [family, setFamily] = useState('article')
  const entity =
    kind === 'relatedList' ? family : kind === 'download' ? 'download' : 'media'
  const selected: Selection[] =
    kind === 'relatedList'
      ? Array.isArray(value)
        ? (value as Selection[])
        : []
      : (kind === 'mediaList'
          ? Array.isArray(value)
            ? value
            : []
          : value == null
            ? []
            : [value]
        ).map((id) => ({ family: entity, id: String(id) }))
  function update(items: Selection[]) {
    onChange(
      kind === 'relatedList'
        ? items
        : kind === 'mediaList'
          ? items.map((item) => Number(item.id))
          : items.length
            ? Number(items[0]!.id)
            : null,
    )
  }
  return (
    <div className="story-editor__list">
      <ol className="story-editor__list">
        {selected.map((item, index) => (
          <SelectedRecord
            key={`${item.family}:${item.id}:${index}`}
            item={item}
            index={index}
            onRemove={() => update(selected.filter((_, i) => i !== index))}
            onMoveUp={() => {
              const next = [...selected]
              ;[next[index - 1], next[index]] = [next[index]!, next[index - 1]!]
              update(next)
            }}
          />
        ))}
      </ol>
      {kind === 'relatedList' ? (
        <label>
          Content family{' '}
          <select
            value={family}
            onChange={(event) => setFamily(event.target.value)}
          >
            {Object.entries(RELATED_ENTITIES).map(([key, label]) => (
              <option key={key} value={key}>
                {label.replaceAll('-', ' ')}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <LibrarySearch
        key={entity}
        inputId={inputId}
        entity={entity}
        locale={locale}
        mediaType={mediaType}
        selected={selected}
        onChoose={(id) =>
          update(
            kind === 'media' || kind === 'download'
              ? [{ family: entity, id: String(id) }]
              : [...selected, { family: entity, id: String(id) }],
          )
        }
      />
      {entity === 'media' ? (
        <p className="muted">
          Upload new files on the Media page, then search for them here.
        </p>
      ) : null}
    </div>
  )
}
