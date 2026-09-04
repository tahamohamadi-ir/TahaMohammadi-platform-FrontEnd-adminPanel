import { useState } from 'react'

import { AdminNav, ADMIN_NAV_ITEMS, filterNavItems } from '@/components/Nav'
import { Notice, SelectField, Table } from '@/components/ui/primitives'
import type { ApprovalStateFilter } from '@/lib/api/approvals'
import { useApprovalQueue } from '@/lib/api/hooks/useApprovals'
import { useAuth } from '@/lib/auth/AuthProvider'

/** Owner approval queue (ADMIN-260/270). Read-only: rows come from the
 * imported seed records; approving is an owner decision recorded in the seed
 * package, never a staff toggle here. */
export function ApprovalQueuePage() {
  const { user } = useAuth()
  const [state, setState] = useState<ApprovalStateFilter>('not-approved')
  const queue = useApprovalQueue(state)

  const data = queue.data

  return (
    <main className="page">
      <AdminNav items={filterNavItems(ADMIN_NAV_ITEMS, user)} />
      <h1>Owner approval queue</h1>
      <p className="muted">
        Read-only checklist from the owner seed package. Approval is an owner
        decision; this page never changes it.
      </p>

      <SelectField
        id="approval-state"
        label="Approval state"
        value={state}
        onChange={(value) => setState(value as ApprovalStateFilter)}
        options={[
          { value: 'not-approved', label: 'Needs owner input' },
          { value: 'approved', label: 'Approved' },
          { value: 'all', label: 'All records' },
        ]}
      />

      {queue.isPending ? <p role="status">Loading queue…</p> : null}
      {queue.error ? (
        <Notice tone="error" title="Queue unavailable">
          The backend did not answer.{' '}
          <button
            type="button"
            className="admin-button admin-button--secondary"
            onClick={() => void queue.refetch()}
          >
            Retry
          </button>
        </Notice>
      ) : null}

      {data ? (
        <>
          <p role="status">
            {data.counts.notApproved} of {data.counts.total} records still need
            owner input ({data.counts.approved} approved).
          </p>
          <Table
            caption="Owner approval queue"
            columns={[
              { key: 'contentId', header: 'Content ID' },
              { key: 'title', header: 'Title' },
              { key: 'locale', header: 'Locale' },
              { key: 'contentType', header: 'Type' },
              { key: 'approvalState', header: 'Approval' },
              { key: 'publicationState', header: 'Publication' },
              {
                key: 'isPublicationAllowed',
                header: 'Publishable',
                render: (row) => (row.isPublicationAllowed ? 'yes' : 'blocked'),
              },
            ]}
            rows={data.items}
            rowKey={(row) => row.contentId}
            emptyMessage="Nothing in this state."
          />
        </>
      ) : null}
    </main>
  )
}
