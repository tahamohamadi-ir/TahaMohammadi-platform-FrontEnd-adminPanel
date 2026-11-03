import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Notice, SelectField, TextField } from '@/components/ui/primitives'
import { AdminApiError } from '@/lib/api/auth'
import {
  fetchAnalyticsReport,
  type AnalyticsReportOut,
} from '@/lib/api/analytics'
import { EmptyState, LoadingState } from '@/components/ui/states'
import { BarChart3Icon } from 'lucide-react'

function defaultFromDate(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]!
}

function defaultToDate(): string {
  return new Date().toISOString().split('T')[0]!
}

/** First-party aggregate analytics dashboard (PU-22-analytics, §I07).
 * Shows date/locale event counts with metric definitions and empty/error/not-connected states. */
export function AnalyticsPage() {
  const [fromDate, setFromDate] = useState<string>(defaultFromDate)
  const [toDate, setToDate] = useState<string>(defaultToDate)
  const [locale, setLocale] = useState<string>('all')

  const queryKey = ['analytics-report', fromDate, toDate, locale] as const

  const analyticsQuery = useQuery<AnalyticsReportOut, Error>({
    queryKey,
    queryFn: () => fetchAnalyticsReport({ from: fromDate, to: toDate, locale }),
    retry: false,
  })

  const isNotConnected =
    analyticsQuery.error instanceof AdminApiError &&
    (analyticsQuery.error.status === 404 ||
      analyticsQuery.error.kind === 'not_found')

  const totalEvents =
    analyticsQuery.data?.rows.reduce((sum, r) => sum + r.count, 0) ?? 0

  return (
    <main className="page">
      <h1>Analytics</h1>

      {/* Metric Definitions & Privacy Notice */}
      <section
        aria-labelledby="analytics-definitions-heading"
        className="admin-panel max-w-4xl bg-muted"
      >
        <h2 id="analytics-definitions-heading" className="text-base">
          Metric definitions & privacy notice
        </h2>
        <p>
          Metrics represent anonymous <strong>received events</strong> recorded
          directly by the first-party Django service. Zero cookies, zero visitor
          IDs, and zero cross-site scripts are loaded. Automated crawlers,
          retries, and bots may inflate counts; metrics do not represent unique
          human beings.
        </p>
        <details className="mt-2">
          <summary className="cursor-pointer font-semibold">
            Event type definitions
          </summary>
          <ul className="my-2 ps-5 text-sm">
            <li>
              <code>page_view</code>: Canonical route visit.
            </li>
            <li>
              <code>cv_download</code>: Curriculum vitae retrieval (target:{' '}
              <code>academic_cv</code> or <code>industry_resume</code>).
            </li>
            <li>
              <code>research_profile_download</code>: Research profile statement
              document download.
            </li>
            <li>
              <code>demo_click</code>: External demo or code repository
              interaction.
            </li>
            <li>
              <code>contact_click</code>: Contact modal or email link
              interaction.
            </li>
            <li>
              <code>contact_submit_success</code>: Verified contact form
              submission.
            </li>
          </ul>
        </details>
      </section>

      {/* Filter Controls */}
      <div className="admin-filter-bar">
        <TextField
          id="analytics-from"
          label="From date"
          type="date"
          value={fromDate}
          onChange={setFromDate}
        />
        <TextField
          id="analytics-to"
          label="To date"
          type="date"
          value={toDate}
          onChange={setToDate}
        />
        <SelectField
          id="analytics-locale"
          label="Locale"
          value={locale}
          onChange={setLocale}
          options={[
            { value: 'all', label: 'All locales' },
            { value: 'en', label: 'English (en)' },
            { value: 'fa', label: 'فارسی (fa)' },
          ]}
        />
        <button
          type="button"
          className="admin-button admin-button--secondary"
          onClick={() => void analyticsQuery.refetch()}
          disabled={analyticsQuery.isFetching}
        >
          {analyticsQuery.isFetching ? 'Updating…' : 'Apply filters'}
        </button>
      </div>

      {analyticsQuery.isPending ? (
        <LoadingState label="Loading analytics report…" variant="cards" />
      ) : null}

      {/* Not-Connected State */}
      {isNotConnected ? (
        <Notice tone="warning" title="Analytics service not connected">
          The first-party aggregate analytics endpoint is not currently
          connected on the server. No visitor tracking is executed on the public
          site.
        </Notice>
      ) : null}

      {/* Generic Error State */}
      {!isNotConnected && analyticsQuery.error ? (
        <Notice tone="error" title="Failed to load analytics">
          {analyticsQuery.error.message}{' '}
          <button
            type="button"
            className="admin-button admin-button--secondary"
            onClick={() => void analyticsQuery.refetch()}
          >
            Retry
          </button>
        </Notice>
      ) : null}

      {/* Report Data */}
      {analyticsQuery.data && !isNotConnected ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="admin-panel my-0">
              <div className="muted admin-small">Primary Metric</div>
              <strong className="text-xl">
                {analyticsQuery.data.metric.replace('_', ' ')}
              </strong>
            </div>
            <div className="admin-panel my-0">
              <div className="muted admin-small">Total Events Count</div>
              <strong className="text-xl">{totalEvents}</strong>
            </div>
            <div className="admin-panel my-0">
              <div className="muted admin-small">Reporting Range</div>
              <div>
                {analyticsQuery.data.from} to {analyticsQuery.data.to} (
                {analyticsQuery.data.timezone})
              </div>
            </div>
          </div>

          <div
            className="admin-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Analytics events table"
          >
            <table className="admin-table">
              <caption className="admin-table__caption">
                Received events ({analyticsQuery.data.rows.length} rows)
              </caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Page path</th>
                  <th scope="col">Locale</th>
                  <th scope="col">Event</th>
                  <th scope="col">Target action</th>
                  <th scope="col">Count</th>
                </tr>
              </thead>
              <tbody>
                {analyticsQuery.data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon={BarChart3Icon}
                        title="No events recorded for the selected date range and locale."
                        description="Widen the dates or switch the locale filter."
                        className="my-1 border-0 bg-transparent py-6"
                      />
                    </td>
                  </tr>
                ) : (
                  analyticsQuery.data.rows.map((row, index) => (
                    <tr
                      key={`${row.date}-${row.pagePath}-${row.event}-${row.target}-${index}`}
                    >
                      <td>{row.date}</td>
                      <td>
                        <code>{row.pagePath}</code>
                      </td>
                      <td>{row.locale}</td>
                      <td>
                        <strong>{row.event}</strong>
                      </td>
                      <td>
                        {row.target ? (
                          <code>{row.target}</code>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        <strong>{row.count}</strong>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </main>
  )
}
