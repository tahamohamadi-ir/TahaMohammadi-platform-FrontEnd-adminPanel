import { useState } from 'react'

import {
  CheckboxField,
  Notice,
  TextareaField,
  TextField,
  ValidationSummary,
  type ValidationIssue,
} from '@/components/ui/primitives'
import { LoadingState } from '@/components/ui/states'
import { AdminApiError } from '@/lib/api/auth'
import {
  useSiteSettings,
  useUpdateSiteSettings,
} from '@/lib/api/hooks/useSiteSettings'

/** Limits mirrored from the server (apps/api/admin_siteconfig.py):
 * brandName ≤ 200, tagline ≤ 500, footerText ≤ 5000,
 * primaryColor ^#[0-9a-fA-F]{6}$, seoDefaultTitle ≤ 200. */
const LIMITS = {
  brandName: 200,
  tagline: 500,
  footerText: 5000,
  seoDefaultTitle: 200,
} as const

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Site settings form: the real GET+PUT /site operation with If-Match
 * optimistic locking. Only the eight scalar fields below are editable here —
 * media slots and nav links stay unchanged (partial update) until their
 * workflows (ADMIN-171/180/190) ship. */
export function SiteSettingsSection({
  settings,
}: {
  settings: ReturnType<typeof useSiteSettings>
}) {
  const update = useUpdateSiteSettings()
  const [clientIssues, setClientIssues] = useState<ValidationIssue[]>([])
  const [serverIssues, setServerIssues] = useState<ValidationIssue[]>([])
  const [conflict, setConflict] = useState(false)
  const [saved, setSaved] = useState(false)

  const data = settings.data

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!data) return
    setClientIssues([])
    setServerIssues([])
    setConflict(false)
    setSaved(false)

    const form = new FormData(event.currentTarget)
    const text = (name: string) => String(form.get(name) ?? '').trim()
    const values = {
      brandName: text('brandName'),
      tagline: text('tagline'),
      seoDefaultTitle: text('seoDefaultTitle'),
      seoDefaultDescription: text('seoDefaultDescription'),
      contactEmail: text('contactEmail'),
      footerText: text('footerText'),
      primaryColor: text('primaryColor'),
      contactFormEnabled: form.get('contactFormEnabled') === 'on',
    }

    const issues: ValidationIssue[] = []
    if (values.brandName.length > LIMITS.brandName) {
      issues.push({
        field: 'brandName',
        message: `Brand name must not exceed ${LIMITS.brandName} characters.`,
        targetId: 'brandName',
      })
    }
    if (values.tagline.length > LIMITS.tagline) {
      issues.push({
        field: 'tagline',
        message: `Tagline must not exceed ${LIMITS.tagline} characters.`,
        targetId: 'tagline',
      })
    }
    if (values.seoDefaultTitle.length > LIMITS.seoDefaultTitle) {
      issues.push({
        field: 'seoDefaultTitle',
        message: `SEO title must not exceed ${LIMITS.seoDefaultTitle} characters.`,
        targetId: 'seoDefaultTitle',
      })
    }
    if (values.footerText.length > LIMITS.footerText) {
      issues.push({
        field: 'footerText',
        message: `Footer text must not exceed ${LIMITS.footerText} characters.`,
        targetId: 'footerText',
      })
    }
    if (values.primaryColor && !HEX_COLOR_RE.test(values.primaryColor)) {
      issues.push({
        field: 'primaryColor',
        message: 'Primary color must match ^#[0-9a-fA-F]{6}$.',
        targetId: 'primaryColor',
      })
    }
    if (values.contactEmail && !EMAIL_RE.test(values.contactEmail)) {
      issues.push({
        field: 'contactEmail',
        message: 'Contact email must be a valid email address.',
        targetId: 'contactEmail',
      })
    }
    if (issues.length > 0) {
      setClientIssues(issues)
      return
    }

    try {
      await update.mutateAsync({ payload: values, ifMatch: data.updatedAt })
      setSaved(true)
    } catch (error) {
      if (error instanceof AdminApiError && error.kind === 'conflict') {
        setConflict(true)
        return
      }
      if (error instanceof AdminApiError && error.kind === 'validation') {
        setServerIssues(
          Object.entries(error.fieldErrors).map(([field, message]) => ({
            field,
            message,
            targetId: field,
          })),
        )
        return
      }
      setServerIssues([
        {
          field: 'form',
          message:
            error instanceof AdminApiError
              ? error.message
              : 'Saving failed. Try again.',
          targetId: 'settings-form-title',
        },
      ])
    }
  }

  const fieldError = (name: string) =>
    [...clientIssues, ...serverIssues].find((issue) => issue.field === name)
      ?.message

  return (
    <section aria-labelledby="settings-form-title">
      <h2 id="settings-form-title">Site settings</h2>
      {settings.isPending ? (
        <LoadingState label="Loading settings…" variant="form" />
      ) : null}
      {settings.error ? (
        <Notice tone="error" title="Settings unavailable">
          The backend did not answer.{' '}
          <button
            type="button"
            className="admin-button admin-button--secondary"
            onClick={() => void settings.refetch()}
          >
            Retry
          </button>
        </Notice>
      ) : null}
      {conflict ? (
        <Notice tone="error" title="Settings changed elsewhere">
          Someone saved newer settings after you loaded this form. Your changes
          were not applied.{' '}
          <button
            type="button"
            className="admin-button admin-button--secondary"
            onClick={() => {
              setConflict(false)
              void settings.refetch()
            }}
          >
            Reload latest
          </button>
        </Notice>
      ) : null}
      {saved ? <Notice tone="success" title="Settings saved" /> : null}
      <ValidationSummary
        title="There is a problem"
        errors={[...clientIssues, ...serverIssues]}
      />
      {data ? (
        <form
          key={data.updatedAt}
          noValidate
          className="admin-panel"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="grid gap-x-6 xl:grid-cols-2">
            <TextField
              id="brandName"
              label="Brand name"
              defaultValue={data.brandName}
              error={fieldError('brandName')}
            />
            <TextField
              id="tagline"
              label="Tagline"
              defaultValue={data.tagline}
              error={fieldError('tagline')}
            />
            <TextField
              id="seoDefaultTitle"
              label="Default SEO title"
              defaultValue={data.seoDefaultTitle}
              error={fieldError('seoDefaultTitle')}
            />
            <TextareaField
              id="seoDefaultDescription"
              label="Default SEO description"
              defaultValue={data.seoDefaultDescription}
              error={fieldError('seoDefaultDescription')}
            />
            <TextField
              id="contactEmail"
              label="Contact email"
              type="email"
              defaultValue={data.contactEmail}
              error={fieldError('contactEmail')}
            />
            <TextareaField
              id="footerText"
              label="Footer text"
              defaultValue={data.footerText}
              error={fieldError('footerText')}
            />
            <TextField
              id="primaryColor"
              label="Primary color"
              description="Hex color like #0f766e."
              defaultValue={data.primaryColor}
              error={fieldError('primaryColor')}
            />
          </div>
          <CheckboxField
            id="contactFormEnabled"
            label="Contact form enabled"
            defaultChecked={data.contactFormEnabled}
          />
          <p className="muted admin-small">
            Media slots and navigation links stay unchanged; they are managed by
            their own workflows.
          </p>
          <p className="m-0">
            <button
              type="submit"
              className="admin-button"
              disabled={update.isPending}
            >
              {update.isPending ? 'Saving…' : 'Save settings'}
            </button>
          </p>
        </form>
      ) : null}
    </section>
  )
}
