import { issueDetail } from '@/components/atlas/issue-labels'
import type { AtlasValidationIssue, AtlasValidationOut } from '@/lib/api/atlas'

export interface ValidationPanelProps {
  issues: AtlasValidationOut
  onGoTo?: (issue: AtlasValidationIssue) => void
  onPublish?: () => void
  publishPending?: boolean
}

function entityOf(issue: AtlasValidationIssue): string | null {
  return issue.nodeKey ?? issue.relationKey ?? issue.groupKey ?? null
}

function canGoTo(issue: AtlasValidationIssue): boolean {
  // Group issues name an entity no Plan B editor section can select —
  // groups have no dedicated authoring form — so only node and relation
  // issues carry a Go-to action.
  return issue.nodeKey !== undefined || issue.relationKey !== undefined
}

/** Validation panel with publish gating (Plan B Task 15).
 *
 * Lists blockers (each with a `Go to <entity>` action that the host
 * routes into graph selection and the matching form) and warnings with
 * counts. Publish stays disabled while any blocker exists, with the
 * blocking count and the reason stated next to it — the UI never
 * downgrades a blocker into a warning.
 */
export function ValidationPanel({
  issues,
  onGoTo,
  onPublish,
  publishPending = false,
}: ValidationPanelProps) {
  const blockers = issues.blocking
  const warnings = issues.warnings
  const publishDisabled = blockers.length > 0 || publishPending

  return (
    <section aria-labelledby="atlas-validation-heading">
      <h2 id="atlas-validation-heading">Validation</h2>
      <p>
        {blockers.length} blocker{blockers.length === 1 ? '' : 's'} ·{' '}
        {warnings.length} warning{warnings.length === 1 ? '' : 's'}
      </p>
      {blockers.length === 0 && warnings.length === 0 ? (
        <p>No validation issues. The draft is ready to publish.</p>
      ) : null}
      {blockers.length > 0 ? (
        <>
          <h3>Blockers</h3>
          <ul>
            {blockers.map((issue, index) => {
              const entity = entityOf(issue)
              const key = `${issue.code}-${entity ?? index}`
              return (
                <li key={key}>
                  <p>{issueDetail(issue)}</p>
                  {canGoTo(issue) && entity ? (
                    <button
                      type="button"
                      className="admin-button admin-button--secondary"
                      onClick={() => onGoTo?.(issue)}
                    >
                      Go to {entity}
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </>
      ) : null}
      {warnings.length > 0 ? (
        <>
          <h3>Warnings</h3>
          <ul>
            {warnings.map((issue, index) => {
              const entity = entityOf(issue)
              const key = `${issue.code}-${entity ?? index}`
              return <li key={key}>{issueDetail(issue)}</li>
            })}
          </ul>
        </>
      ) : null}
      <button
        type="button"
        className="admin-button"
        disabled={publishDisabled}
        aria-describedby={
          blockers.length > 0 ? 'atlas-publish-blocked-reason' : undefined
        }
        onClick={() => onPublish?.()}
      >
        Publish
      </button>
      {blockers.length > 0 ? (
        <p id="atlas-publish-blocked-reason">
          Publish is blocked by {blockers.length} blocker
          {blockers.length === 1 ? '' : 's'}. Resolve every blocker to publish.
        </p>
      ) : null}
    </section>
  )
}
