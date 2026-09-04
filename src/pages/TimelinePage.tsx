import { useState } from 'react'

import { AdminNav, ADMIN_NAV_ITEMS, filterNavItems } from '@/components/Nav'
import {
  Dialog,
  Notice,
  TextareaField,
  TextField,
} from '@/components/ui/primitives'
import { AdminApiError } from '@/lib/api/auth'
import type { TimelineAdminOut, TimelinePatchIn } from '@/lib/api/timeline'
import {
  useCreateTimelineRecord,
  useDeleteTimelineRecord,
  useReorderTimeline,
  useTimeline,
  useUpdateTimelineRecord,
} from '@/lib/api/hooks/useTimeline'
import { useAuth } from '@/lib/auth/AuthProvider'
import { LocaleTabs } from '@/pages/HomePage'

const MAX_LABEL = 200

/** Timeline editor (ADMIN-200). Create appends (optional after_id insert),
 * reorder posts the full id permutation, edit/delete carry the row's
 * updatedAt as If-Match; 428/409 surface as reload-latest conflicts. The
 * backend owns lifecycle and validation rules. */
export function TimelinePage() {
  const { user } = useAuth()
  const [locale, setLocale] = useState<'en' | 'fa'>('en')
  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState('job')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editBody, setEditBody] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<TimelineAdminOut | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)

  const timeline = useTimeline(locale)
  const create = useCreateTimelineRecord(locale)
  const reorder = useReorderTimeline(locale)
  const update = useUpdateTimelineRecord(locale)
  const remove = useDeleteTimelineRecord(locale)

  const rows = timeline.data?.items ?? []

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const label = newLabel.trim()
    if (!label) {
      setError('Label is required.')
      return
    }
    if (label.length > MAX_LABEL) {
      setError(`Label must not exceed ${MAX_LABEL} characters.`)
      return
    }
    try {
      await create.mutateAsync({
        type: newType,
        label,
        period_label: '',
        body: '',
        role: '',
        weight: 0,
        detail_url: '',
        attach: null,
        after_id: null,
      })
      setNewLabel('')
    } catch (caught) {
      setError(
        caught instanceof AdminApiError
          ? caught.message
          : 'Create failed. Try again.',
      )
    }
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta
    if (target < 0 || target >= rows.length) return
    const ids = rows.map((row) => row.id)
    const [moved] = ids.splice(index, 1)
    ids.splice(target, 0, moved!)
    void reorder.mutateAsync(ids).catch((caught) => {
      setError(
        caught instanceof AdminApiError
          ? caught.message
          : 'Reorder failed. Try again.',
      )
    })
  }

  function startEdit(row: TimelineAdminOut) {
    setEditingId(row.id)
    setEditLabel(row.label)
    setEditBody(row.body)
    setError(null)
  }

  async function saveRow(row: TimelineAdminOut) {
    setError(null)
    const label = editLabel.trim()
    if (!label) {
      setError('Label is required.')
      return
    }
    if (label.length > MAX_LABEL) {
      setError(`Label must not exceed ${MAX_LABEL} characters.`)
      return
    }
    try {
      // Patch only what changed: the partial payload must never carry an
      // untouched field (explicit values overwrite server state).
      const payload: TimelinePatchIn = {}
      if (label !== row.label) payload.label = label
      if (editBody !== row.body) payload.body = editBody
      if (Object.keys(payload).length === 0) {
        setEditingId(null)
        return
      }
      await update.mutateAsync({
        id: row.id,
        payload,
        ifMatch: row.updatedAt,
      })
      setEditingId(null)
    } catch (caught) {
      if (caught instanceof AdminApiError && caught.kind === 'conflict') {
        setError('This row changed elsewhere. Reload latest and retry.')
        return
      }
      setError(
        caught instanceof AdminApiError
          ? caught.message
          : 'Save failed. Try again.',
      )
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setError(null)
    try {
      await remove.mutateAsync({
        id: deleteTarget.id,
        ifMatch: deleteTarget.updatedAt,
      })
      setDeleteTarget(null)
    } catch (caught) {
      setDeleteTarget(null)
      if (caught instanceof AdminApiError && caught.kind === 'conflict') {
        setError('This row changed elsewhere. Reload latest and retry.')
        return
      }
      setError(
        caught instanceof AdminApiError
          ? caught.message
          : 'Delete failed. Try again.',
      )
    }
  }

  return (
    <main className="page">
      <AdminNav items={filterNavItems(ADMIN_NAV_ITEMS, user)} />
      <h1>Timeline</h1>
      <LocaleTabs locale={locale} onChange={setLocale} />

      {timeline.isPending ? <p role="status">Loading timeline…</p> : null}
      {error ? (
        <Notice tone="error" title="Action failed">
          {error}{' '}
          <button
            type="button"
            className="admin-button admin-button--secondary"
            onClick={() => void timeline.refetch()}
          >
            Reload latest
          </button>
        </Notice>
      ) : null}
      {timeline.error ? (
        <Notice tone="error" title="Timeline unavailable">
          The backend did not answer.{' '}
          <button
            type="button"
            className="admin-button admin-button--secondary"
            onClick={() => void timeline.refetch()}
          >
            Retry
          </button>
        </Notice>
      ) : null}

      <form onSubmit={(event) => void handleCreate(event)}>
        <TextField
          id="timeline-new-type"
          label="New type"
          value={newType}
          onChange={setNewType}
        />
        <TextField
          id="timeline-new-label"
          label="New label"
          value={newLabel}
          onChange={setNewLabel}
        />
        <p>
          <button
            type="submit"
            className="admin-button"
            disabled={create.isPending}
          >
            Add record
          </button>
        </p>
      </form>

      {timeline.data ? (
        <ol className="admin-timeline">
          {rows.map((row, index) => (
            <li key={row.id} className="admin-timeline__row">
              <div>
                <strong>{row.label}</strong>{' '}
                <span className="muted">
                  {row.type} · order {row.order}
                  {row.period_label ? ` · ${row.period_label}` : ''}
                </span>
              </div>
              <div>
                <button
                  type="button"
                  className="admin-button admin-button--secondary"
                  disabled={index === 0 || reorder.isPending}
                  onClick={() => move(index, -1)}
                >
                  Move up
                </button>{' '}
                <button
                  type="button"
                  className="admin-button admin-button--secondary"
                  disabled={index === rows.length - 1 || reorder.isPending}
                  onClick={() => move(index, 1)}
                >
                  Move down
                </button>{' '}
                <button
                  type="button"
                  className="admin-button admin-button--secondary"
                  onClick={() => startEdit(row)}
                >
                  Edit
                </button>{' '}
                <button
                  type="button"
                  className="admin-button admin-button--secondary"
                  onClick={() => setDeleteTarget(row)}
                >
                  Delete
                </button>
              </div>
              {editingId === row.id ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    void saveRow(row)
                  }}
                >
                  <TextField
                    id={`timeline-label-${row.id}`}
                    label="Label"
                    value={editLabel}
                    onChange={setEditLabel}
                  />
                  <TextareaField
                    id={`timeline-body-${row.id}`}
                    label="Body"
                    value={editBody}
                    onChange={setEditBody}
                  />
                  <p>
                    <button
                      type="submit"
                      className="admin-button"
                      disabled={update.isPending}
                    >
                      Save row
                    </button>
                  </p>
                </form>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}

      <Dialog
        title={
          deleteTarget ? `Delete “${deleteTarget.label}”?` : 'Delete record?'
        }
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
      >
        <p>This permanently removes the timeline record.</p>
        <button
          type="button"
          className="admin-button"
          disabled={remove.isPending}
          onClick={() => void handleDelete()}
        >
          Confirm delete
        </button>
      </Dialog>
    </main>
  )
}
