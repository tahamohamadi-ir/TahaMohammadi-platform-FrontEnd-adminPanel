import { useState } from 'react'

import { Dialog, Notice, Table, TextField } from '@/components/ui/primitives'
import { LoadingState } from '@/components/ui/states'
import { AdminApiError } from '@/lib/api/auth'
import {
  useContentRevisions,
  useCreateContentRevision,
  useRestoreContentRevision,
} from '@/lib/api/hooks/useContentRevisions'

/** Immutable snapshots and restore-as-draft. The revision hooks live on the
 * page so their pending state also blocks the metadata Save button. */
export function HistorySection({
  busy,
  revisions,
  createRevision,
  restoreRevision,
}: {
  busy: boolean
  revisions: ReturnType<typeof useContentRevisions>
  createRevision: ReturnType<typeof useCreateContentRevision>
  restoreRevision: ReturnType<typeof useRestoreContentRevision>
}) {
  const [snapshotNote, setSnapshotNote] = useState('')
  const [restoreTarget, setRestoreTarget] = useState<number | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)

  async function handleSnapshot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
    <section aria-labelledby="history-title" className="admin-panel">
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
      {revisions.isPending ? (
        <LoadingState label="Loading history…" variant="lines" />
      ) : null}
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
    </section>
  )
}
