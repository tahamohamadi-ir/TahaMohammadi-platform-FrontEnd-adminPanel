import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AdminNav, ADMIN_NAV_ITEMS, filterNavItems } from '@/components/Nav'
import { Notice, SelectField } from '@/components/ui/primitives'
import { AdminApiError, adminJson } from '@/lib/api/auth'
import { useAuth } from '@/lib/auth/AuthProvider'

export interface PublicationJobOut {
  id: string
  state: 'queued' | 'running' | 'completed' | 'failed' | string
  locale: string | null
  requestedRevision: string
  deployedRevision: string | null
  affectedPaths: string[]
  revokedPaths: string[]
  removalState: 'not_requested' | 'pending' | 'removed' | string
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  errorCode: string | null
  updatedAt: string
}

export interface PublicationJobListOut {
  count: number
  items: PublicationJobOut[]
}

/** Publication jobs monitor (PU-12-jobs, §I06).
 * Distinguishes CMS data saves from asynchronous site deployments.
 * Surfaces pending removals, safe error codes, and idempotent retry. */
export function PublicationJobsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [stateFilter, setStateFilter] = useState<string>('all')
  const [localeFilter, setLocaleFilter] = useState<string>('all')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const queryKey = ['publication-jobs', stateFilter, localeFilter] as const

  const jobsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ page: '1', page_size: '50' })
      if (stateFilter !== 'all') params.set('state', stateFilter)
      if (localeFilter !== 'all') params.set('locale', localeFilter)
      return adminJson<PublicationJobListOut>(
        `/publication-jobs?${params.toString()}`,
      )
    },
    refetchInterval: 10000,
  })

  const retryMutation = useMutation({
    mutationFn: async (job: PublicationJobOut) => {
      const idempotencyKey = `retry-${job.id}-${Date.now()}`
      return adminJson<PublicationJobOut>(`/publication-jobs/${job.id}/retry`, {
        method: 'POST',
        headers: {
          'If-Match': job.updatedAt,
          'Idempotency-Key': idempotencyKey,
        },
      })
    },
    onSuccess: (retriedJob) => {
      setMessage(`Retry job enqueued (${retriedJob.id}).`)
      setError(null)
      void queryClient.invalidateQueries({ queryKey: ['publication-jobs'] })
    },
    onError: (caught) => {
      setMessage(null)
      setError(
        caught instanceof AdminApiError
          ? caught.message
          : 'Failed to retry publication job.',
      )
    },
  })

  return (
    <main className="page">
      <AdminNav items={filterNavItems(ADMIN_NAV_ITEMS, user)} />
      <h1>Publication jobs</h1>

      {/* Save vs. Site Deployment Distinction Banner */}
      <section
        aria-labelledby="deployment-explainer"
        style={{
          padding: '1rem',
          backgroundColor: 'var(--surface-muted, #f8f9fa)',
          border: '1px solid var(--border, #e9ecef)',
          borderRadius: '6px',
          marginBottom: '1.5rem',
        }}
      >
        <h2
          id="deployment-explainer"
          style={{ fontSize: '1.1rem', marginTop: 0 }}
        >
          Save vs. Site Deployment
        </h2>
        <p style={{ margin: 0 }}>
          <strong>CMS Saves</strong> persist content changes immediately to the
          database with lifecycle controls.
          <strong> Site Deployment</strong> is an asynchronous background
          process that generates, tests, and publishes static site pages. When
          content is published or unpublished, a publication job is queued.
        </p>
      </section>

      {message ? <p role="status">{message}</p> : null}
      {error ? (
        <Notice tone="error" title="Action failed">
          {error}
        </Notice>
      ) : null}

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <SelectField
          id="state-filter"
          label="Filter by state"
          value={stateFilter}
          onChange={setStateFilter}
          options={[
            { value: 'all', label: 'All states' },
            { value: 'queued', label: 'Queued' },
            { value: 'running', label: 'Running' },
            { value: 'completed', label: 'Completed' },
            { value: 'failed', label: 'Failed' },
          ]}
        />
        <SelectField
          id="locale-filter"
          label="Filter by locale"
          value={localeFilter}
          onChange={setLocaleFilter}
          options={[
            { value: 'all', label: 'All locales' },
            { value: 'en', label: 'English (en)' },
            { value: 'fa', label: 'فارسی (fa)' },
          ]}
        />
        <button
          type="button"
          className="admin-button admin-button--secondary"
          style={{ alignSelf: 'flex-end', marginBottom: '0.25rem' }}
          onClick={() => void jobsQuery.refetch()}
          disabled={jobsQuery.isFetching}
        >
          {jobsQuery.isFetching ? 'Refreshing…' : 'Refresh jobs'}
        </button>
      </div>

      {jobsQuery.isPending ? (
        <p role="status">Loading publication jobs…</p>
      ) : null}
      {jobsQuery.error ? (
        <Notice tone="error" title="Failed to load publication jobs">
          Unable to retrieve publication jobs from backend.{' '}
          <button
            type="button"
            className="admin-button admin-button--secondary"
            onClick={() => void jobsQuery.refetch()}
          >
            Retry
          </button>
        </Notice>
      ) : null}

      {jobsQuery.data ? (
        <div
          className="admin-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Publication jobs table"
        >
          <table className="admin-table">
            <caption className="admin-table__caption">
              Publication Jobs ({jobsQuery.data.count} total)
            </caption>
            <thead>
              <tr>
                <th scope="col">Job ID</th>
                <th scope="col">State</th>
                <th scope="col">Locale</th>
                <th scope="col">Revision</th>
                <th scope="col">Affected / Revoked paths</th>
                <th scope="col">Removal state</th>
                <th scope="col">Timestamps</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobsQuery.data.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="muted">
                    No publication jobs found.
                  </td>
                </tr>
              ) : (
                jobsQuery.data.items.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <code>{job.id}</code>
                      {job.errorCode ? (
                        <div
                          style={{
                            color: 'var(--color-error, #c92a2a)',
                            fontSize: '0.85rem',
                            marginTop: '0.25rem',
                          }}
                        >
                          Error: <strong>{job.errorCode}</strong>
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <span
                        className={`badge badge--${job.state}`}
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          backgroundColor:
                            job.state === 'completed'
                              ? '#d3f9d8'
                              : job.state === 'failed'
                                ? '#ffe3e3'
                                : '#e7f5ff',
                          color:
                            job.state === 'completed'
                              ? '#2b8a3e'
                              : job.state === 'failed'
                                ? '#c92a2a'
                                : '#1864ab',
                        }}
                      >
                        {job.state}
                      </span>
                    </td>
                    <td>{job.locale ?? 'all'}</td>
                    <td>
                      <div>
                        <small className="muted">Req:</small>{' '}
                        <code>{job.requestedRevision}</code>
                      </div>
                      {job.deployedRevision ? (
                        <div>
                          <small className="muted">Dep:</small>{' '}
                          <code>{job.deployedRevision}</code>
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {job.affectedPaths.length > 0 ? (
                        <div>
                          <small>Affected ({job.affectedPaths.length}):</small>
                          <ul
                            style={{
                              margin: 0,
                              paddingLeft: '1.2rem',
                              fontSize: '0.85rem',
                            }}
                          >
                            {job.affectedPaths.slice(0, 3).map((p) => (
                              <li key={p}>{p}</li>
                            ))}
                            {job.affectedPaths.length > 3 ? <li>…</li> : null}
                          </ul>
                        </div>
                      ) : null}
                      {job.revokedPaths.length > 0 ? (
                        <div style={{ marginTop: '0.25rem' }}>
                          <small style={{ color: '#c92a2a' }}>
                            Revoked ({job.revokedPaths.length}):
                          </small>
                          <ul
                            style={{
                              margin: 0,
                              paddingLeft: '1.2rem',
                              fontSize: '0.85rem',
                            }}
                          >
                            {job.revokedPaths.slice(0, 3).map((p) => (
                              <li key={p}>{p}</li>
                            ))}
                            {job.revokedPaths.length > 3 ? <li>…</li> : null}
                          </ul>
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight:
                            job.removalState === 'pending' ? 'bold' : 'normal',
                          color:
                            job.removalState === 'pending'
                              ? '#e67700'
                              : 'inherit',
                        }}
                      >
                        {job.removalState}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem' }}>
                        <div>
                          Created: {new Date(job.createdAt).toLocaleString()}
                        </div>
                        {job.finishedAt ? (
                          <div>
                            Finished:{' '}
                            {new Date(job.finishedAt).toLocaleString()}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      {job.state === 'failed' ? (
                        <button
                          type="button"
                          className="admin-button admin-button--secondary"
                          aria-label={`Retry job ${job.id}`}
                          disabled={retryMutation.isPending}
                          onClick={() => retryMutation.mutate(job)}
                        >
                          {retryMutation.isPending ? 'Retrying…' : 'Retry'}
                        </button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  )
}
