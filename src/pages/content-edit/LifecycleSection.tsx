import { useState } from 'react'

import { Dialog, Notice, TextField } from '@/components/ui/primitives'

/** Lifecycle transitions (review / publish / schedule / archive). Publish and
 * schedule always pass through a confirmation dialog; the backend validates
 * every transition and the page shows its failure. */
export function LifecycleSection({
  busy,
  approvalBlocked,
  onTransition,
}: {
  busy: boolean
  approvalBlocked: boolean
  onTransition: (to: string, scheduledFor?: string | null) => Promise<void>
}) {
  const [confirmPublish, setConfirmPublish] = useState(false)
  const [confirmSchedule, setConfirmSchedule] = useState(false)
  const [scheduledFor, setScheduledFor] = useState('')

  async function runTransition(to: string, at?: string | null) {
    await onTransition(to, at)
    setConfirmPublish(false)
  }

  return (
    <section aria-labelledby="lifecycle-title" className="admin-panel">
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
            The seed record for this content has not been approved by the owner
            yet; publish is blocked until then (server-enforced).
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
          onClick={() => void runTransition('archived')}
        >
          Archive
        </button>
      </div>

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
    </section>
  )
}
