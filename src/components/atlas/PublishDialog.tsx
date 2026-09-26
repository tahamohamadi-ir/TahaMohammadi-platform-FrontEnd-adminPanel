import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { issueDetail } from '@/components/atlas/issue-labels'
import {
  activateAtlasVersion,
  type AtlasValidationIssue,
} from '@/lib/api/atlas'
import { AdminApiError } from '@/lib/api/auth'
import { Notice } from '@/components/ui/primitives'

export interface PublishResult {
  id: number
  status: string
  publishedAt: string
  enqueuedPublicationJob: number | null
}

export interface PublishDialogProps {
  versionId: number
  revision: string
  versionLabel: string
  nodeCount: number
  relationCount: number
  warningCount: number
  onPublished: (result: PublishResult) => void
  onValidationBlocked: (issues: AtlasValidationIssue[]) => void
  onReload: () => void
  onClose: () => void
}

type Outcome =
  | { status: 'success'; result: PublishResult }
  | { status: 'error'; code: string; message: string }

/** Publish confirmation and post-publish status (Plan B Task 16 shape,
 * delivered in Task 15 per the execution card).
 *
 * A plain confirmation region — deliberately not a modal dialog, so no
 * focus trap. Publish succeeds only after the backend answers success:
 * no optimistic state, a failed publish never presents success, and a
 * second click while pending cannot double-submit.
 */
export function PublishDialog({
  versionId,
  revision,
  versionLabel,
  nodeCount,
  relationCount,
  warningCount,
  onPublished,
  onValidationBlocked,
  onReload,
  onClose,
}: PublishDialogProps) {
  const [blockedIssues, setBlockedIssues] = useState<AtlasValidationIssue[]>([])
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const publishMutation = useMutation({
    mutationFn: () => activateAtlasVersion(versionId, revision),
    onSuccess: (result) => {
      setBlockedIssues([])
      const done: Outcome = { status: 'success', result }
      setOutcome(done)
      onPublished(result)
    },
    onError: (caught) => {
      if (caught instanceof AdminApiError) {
        if (caught.code === 'VALIDATION_BLOCKED') {
          const issues: AtlasValidationIssue[] = caught.issues.map((issue) => ({
            code: issue.code,
            messageToken: issue.messageToken,
            ...(issue.nodeKey ? { nodeKey: issue.nodeKey } : {}),
            ...(issue.relationKey ? { relationKey: issue.relationKey } : {}),
            ...(issue.groupKey ? { groupKey: issue.groupKey } : {}),
          }))
          setBlockedIssues(issues)
          setOutcome({
            status: 'error',
            code: caught.code,
            message: caught.message,
          })
          onValidationBlocked(issues)
          return
        }
        setOutcome({
          status: 'error',
          code: caught.code,
          message: caught.message,
        })
      } else {
        setOutcome({
          status: 'error',
          code: 'NETWORK_ERROR',
          message: 'Failed to publish the version.',
        })
      }
    },
  })

  if (outcome?.status === 'success') {
    const result = outcome.result
    return (
      <section aria-labelledby="atlas-publish-status-heading">
        <h2 id="atlas-publish-status-heading">Publish status</h2>
        <p role="status">
          Published {result.publishedAt}
          {result.enqueuedPublicationJob !== null
            ? ` · Publication job ${result.enqueuedPublicationJob}`
            : ' · No publication job was enqueued.'}
        </p>
      </section>
    )
  }

  const pending = publishMutation.isPending
  const stale =
    outcome?.status === 'error' &&
    (outcome.code === 'STALE_REVISION' || outcome.code === 'ALREADY_ACTIVE')

  return (
    <section aria-labelledby="atlas-publish-confirm-heading">
      <h2 id="atlas-publish-confirm-heading">Publish {versionLabel}</h2>
      <p>
        {nodeCount} node{nodeCount === 1 ? '' : 's'}, {relationCount} relation
        {relationCount === 1 ? '' : 's'}, {warningCount} warning
        {warningCount === 1 ? '' : 's'}. Publishing makes this draft the active
        Atlas version.
      </p>
      {outcome?.status === 'error' ? (
        <Notice tone="error" title="Failed to publish the version">
          {outcome.message}
        </Notice>
      ) : null}
      {blockedIssues.length > 0 ? (
        <ul>
          {blockedIssues.map((issue, index) => (
            <li
              key={`${issue.code}-${issue.nodeKey ?? issue.relationKey ?? issue.groupKey ?? index}`}
            >
              {issueDetail(issue)}
            </li>
          ))}
        </ul>
      ) : null}
      {pending ? <p role="status">Publishing…</p> : null}
      {stale ? (
        <button type="button" className="admin-button" onClick={onReload}>
          Reload
        </button>
      ) : (
        <button
          type="button"
          className="admin-button"
          disabled={pending}
          onClick={() => publishMutation.mutate()}
        >
          {pending ? 'Publishing…' : 'Confirm publish'}
        </button>
      )}
      <button
        type="button"
        className="admin-button admin-button--secondary"
        disabled={pending}
        onClick={onClose}
      >
        Cancel
      </button>
    </section>
  )
}
