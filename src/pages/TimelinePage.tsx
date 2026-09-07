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
  const [newRole, setNewRole] = useState('')
  const [newPeriodLabel, setNewPeriodLabel] = useState('')
  const [newDetailUrl, setNewDetailUrl] = useState('')
  const [newAttach, setNewAttach] = useState('')
  const [newBody, setNewBody] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editPeriodLabel, setEditPeriodLabel] = useState('')
  const [editDetailUrl, setEditDetailUrl] = useState('')
  const [editAttach, setEditAttach] = useState('')
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
        period_label: newPeriodLabel.trim(),
        body: newBody.trim(),
        role: newRole.trim(),
        weight: 0,
        detail_url: newDetailUrl.trim(),
        attach: newAttach.trim() ? Number(newAttach.trim()) : null,
        after_id: null,
      })
      setNewLabel('')
      setNewRole('')
      setNewPeriodLabel('')
      setNewDetailUrl('')
      setNewAttach('')
      setNewBody('')
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
    setEditRole(row.role ?? '')
    setEditPeriodLabel(row.period_label ?? '')
    setEditDetailUrl(row.detail_url ?? '')
    setEditAttach(row.attach ? String(row.attach) : '')
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
      if (editRole !== (row.role ?? '')) payload.role = editRole
      if (editPeriodLabel !== (row.period_label ?? ''))
        payload.period_label = editPeriodLabel
      if (editDetailUrl !== (row.detail_url ?? ''))
        payload.detail_url = editDetailUrl
      const attachVal = editAttach.trim() ? Number(editAttach.trim()) : null
      if (attachVal !== row.attach) payload.attach = attachVal
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
        <TextField
          id="timeline-new-role"
          label="Role"
          value={newRole}
          onChange={setNewRole}
        />
        <TextField
          id="timeline-new-period"
          label="Period label"
          value={newPeriodLabel}
          onChange={setNewPeriodLabel}
        />
        <TextField
          id="timeline-new-detail-url"
          label="Detail URL / Timeline link"
          value={newDetailUrl}
          onChange={setNewDetailUrl}
          description="Link to related project, publication, or credential."
        />
        <TextField
          id="timeline-new-attach"
          label="Attached Profile ID"
          value={newAttach}
          onChange={setNewAttach}
          description="Numeric ID of the owner profile to attach."
        />
        <TextareaField
          id="timeline-new-body"
          label="Body"
          value={newBody}
          onChange={setNewBody}
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
                  {row.role ? ` · ${row.role}` : ''}
                  {row.period_label ? ` · ${row.period_label}` : ''}
                  {row.attach ? ` · profile #${row.attach}` : ''}
                </span>
                {row.detail_url ? (
                  <div>
                    <a
                      href={row.detail_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.85rem' }}
                    >
                      {row.detail_url}
                    </a>
                  </div>
                ) : null}
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
                  <TextField
                    id={`timeline-role-${row.id}`}
                    label="Role"
                    value={editRole}
                    onChange={setEditRole}
                  />
                  <TextField
                    id={`timeline-period-${row.id}`}
                    label="Period label"
                    value={editPeriodLabel}
                    onChange={setEditPeriodLabel}
                  />
                  <TextField
                    id={`timeline-detail-url-${row.id}`}
                    label="Detail URL"
                    value={editDetailUrl}
                    onChange={setEditDetailUrl}
                  />
                  <TextField
                    id={`timeline-attach-${row.id}`}
                    label="Attached Profile ID"
                    value={editAttach}
                    onChange={setEditAttach}
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
