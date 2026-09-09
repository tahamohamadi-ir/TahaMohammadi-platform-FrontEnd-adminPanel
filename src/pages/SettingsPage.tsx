import { useEffect, useState } from 'react'

import { AdminNav, ADMIN_NAV_ITEMS, filterNavItems } from '@/components/Nav'
import {
  CheckboxField,
  Notice,
  SelectField,
  Table,
  TextareaField,
  TextField,
  ValidationSummary,
  type ValidationIssue,
} from '@/components/ui/primitives'
import { useAuth } from '@/lib/auth/AuthProvider'
import { AdminApiError } from '@/lib/api/auth'
import {
  useLocalizedSiteSettings,
  usePublishLocalizedSiteSettings,
  useSiteSettings,
  useUpdateLocalizedSiteSettings,
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

/** Profile + site settings (ADMIN-150). Profile facts are read-only from the
 * session (/auth/me); settings use the real GET+PUT /site operation with
 * If-Match optimistic locking. Only the eight scalar fields below are
 * editable here — media slots and nav links stay unchanged (partial update)
 * until their workflows (ADMIN-171/180/190) ship. */
export function SettingsPage() {
  const { user } = useAuth()
  const settings = useSiteSettings()
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
    <main className="page">
      <AdminNav items={filterNavItems(ADMIN_NAV_ITEMS, user)} />
      <h1>Settings</h1>

      <section aria-labelledby="profile-title">
        <h2 id="profile-title">Profile</h2>
        <dl>
          <dt>Display name</dt>
          <dd>{user?.displayName}</dd>
          <dt>Email</dt>
          <dd>{user?.email}</dd>
          <dt>MFA enrolled</dt>
          <dd>{user?.mfaEnrolled ? 'yes' : 'no'}</dd>
          <dt>OTP verified this session</dt>
          <dd>{user?.otpVerified ? 'yes' : 'no'}</dd>
        </dl>
        <p className="muted">
          Profile facts come from the session and are read-only here.
        </p>
      </section>

      <section aria-labelledby="seed-policy-title">
        <h2 id="seed-policy-title">Seed policy</h2>
        {data?.seedPolicy ? (
          <>
            <p className="muted">
              Owner policy from the seed package (read-only; applied server-side
              at import). Surfaces it withholds show as empty in the form.
            </p>
            <Table
              caption="Seed policy decisions"
              columns={[
                { key: 'key', header: 'Policy key' },
                { key: 'value', header: 'Value' },
              ]}
              rows={Object.entries(data.seedPolicy).map(([key, value]) => ({
                key,
                value: String(value),
              }))}
              rowKey={(row: { key: string }) => row.key}
            />
          </>
        ) : (
          <p role="status" className="muted">
            No seed policy recorded (site settings were not seeded).
          </p>
        )}
      </section>

      <section aria-labelledby="settings-form-title">
        <h2 id="settings-form-title">Site settings</h2>
        {settings.isPending ? <p role="status">Loading settings…</p> : null}
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
            Someone saved newer settings after you loaded this form. Your
            changes were not applied.{' '}
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
            onSubmit={(event) => void handleSubmit(event)}
          >
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
            <CheckboxField
              id="contactFormEnabled"
              label="Contact form enabled"
              defaultChecked={data.contactFormEnabled}
            />
            <p className="muted">
              Media slots and navigation links stay unchanged; they are managed
              by their own workflows.
            </p>
            <p>
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

      <LocalizedSettingsSection />
    </main>
  )
}

function LocalizedSettingsSection() {
  const [locale, setLocale] = useState<'en' | 'fa'>('en')
  const localized = useLocalizedSiteSettings(locale)
  const update = useUpdateLocalizedSiteSettings(locale)
  const publish = usePublishLocalizedSiteSettings(locale)
  const [conflict, setConflict] = useState(false)
  const [saved, setSaved] = useState(false)
  const [published, setPublished] = useState(false)
  const [issues, setIssues] = useState<ValidationIssue[]>([])
  const [navLinks, setNavLinks] = useState<{ label: string; href: string }[]>(
    [],
  )
  const [copyEntries, setCopyEntries] = useState<
    { key: string; value: string }[]
  >([])
  const data = localized.data

  useEffect(() => {
    if (data) {
      setNavLinks(
        (data.navLinks ?? []).map((lnk) => ({
          label: lnk.label ?? '',
          href: lnk.href ?? '',
        })),
      )
      setCopyEntries(
        data.contentCopy
          ? Object.entries(data.contentCopy).map(([key, value]) => ({
              key,
              value: String(value),
            }))
          : [],
      )
    }
  }, [data, locale])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      if (!data) return
      setIssues([])
      setConflict(false)
      setSaved(false)
      setPublished(false)

      const form = new FormData(event.currentTarget)
      const text = (name: string) => String(form.get(name) ?? '').trim()

      const brandName = text('locBrandName')
      const tagline = text('locTagline')
      const footerText = text('locFooterText')
      const seoTitle = text('locSeoTitle')
      const seoDescription = text('locSeoDescription')
      const graphPreset = text('graphPreset') || 'atlas-v2'
      const portalPreset = text('portalPreset') || 'arch-v2'
      const motion = text('motion') || 'full'
      const density = text('density') || 'standard'

      const researchLabel = text('audResearchLabel')
      const researchHref = text('audResearchHref')
      const employmentLabel = text('audEmploymentLabel')
      const employmentHref = text('audEmploymentHref')

      const audienceLinks = [
        { kind: 'research', label: researchLabel, href: researchHref },
        { kind: 'employment', label: employmentLabel, href: employmentHref },
      ].filter((link) => link.label && link.href)

      const copyRecord: Record<string, string> = {}
      for (const entry of copyEntries) {
        const k = entry.key.trim()
        if (k) {
          copyRecord[k] = entry.value
        }
      }

      const validNavLinks = navLinks
        .map((l) => ({ label: l.label.trim(), href: l.href.trim() }))
        .filter((l) => l.label && l.href)

      const payload = {
        brandName,
        tagline,
        footerText,
        seo: {
          title: seoTitle,
          description: seoDescription,
        },
        scene: {
          graphPreset,
          portalPreset,
          motion,
          density,
        },
        audienceLinks,
        navLinks: validNavLinks,
        contentCopy: copyRecord,
      }

      await update.mutateAsync({ payload, ifMatch: data.updatedAt })
      setSaved(true)
    } catch (caught) {
      if (caught instanceof AdminApiError && caught.kind === 'conflict') {
        setConflict(true)
        return
      }
      setIssues([
        {
          field: 'submit',
          message:
            caught instanceof AdminApiError
              ? caught.message
              : 'Failed to update localized settings.',
          targetId: 'localized-settings-title',
        },
      ])
    }
  }

  async function handlePublish() {
    setIssues([])
    setSaved(false)
    setPublished(false)
    try {
      await publish.mutateAsync()
      setPublished(true)
    } catch (caught) {
      setIssues([
        {
          field: 'publish',
          message:
            caught instanceof AdminApiError
              ? caught.message
              : 'Failed to publish localized settings.',
          targetId: 'localized-settings-title',
        },
      ])
    }
  }

  return (
    <section aria-labelledby="localized-settings-title">
      <h2 id="localized-settings-title">
        Localized site identity & scene presets
      </h2>
      <div
        role="tablist"
        aria-label="Settings locale"
        className="admin-nav"
        style={{ marginBottom: '1rem' }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={locale === 'en'}
          className={`admin-nav__link ${locale === 'en' ? 'active' : ''}`}
          onClick={() => {
            setLocale('en')
            setSaved(false)
            setPublished(false)
            setConflict(false)
          }}
        >
          English (en)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={locale === 'fa'}
          className={`admin-nav__link ${locale === 'fa' ? 'active' : ''}`}
          onClick={() => {
            setLocale('fa')
            setSaved(false)
            setPublished(false)
            setConflict(false)
          }}
        >
          فارسی (fa)
        </button>
      </div>

      {localized.isPending ? (
        <p role="status">Loading localized settings…</p>
      ) : null}
      {localized.error ? (
        <Notice tone="error" title="Localized settings unavailable">
          Could not load localized settings for {locale}.
        </Notice>
      ) : null}
      {conflict ? (
        <Notice tone="error" title="Settings changed elsewhere">
          Someone modified this locale settings since you loaded them.{' '}
          <button
            type="button"
            className="admin-button admin-button--secondary"
            onClick={() => {
              setConflict(false)
              void localized.refetch()
            }}
          >
            Reload latest
          </button>
        </Notice>
      ) : null}
      {saved ? <Notice tone="success" title="Localized draft saved" /> : null}
      {published ? (
        <Notice tone="success" title="Localized settings published" />
      ) : null}
      <ValidationSummary title="Validation issues" errors={issues} />

      {data && data.locale ? (
        <form
          key={`${locale}-${data.updatedAt}`}
          noValidate
          dir={locale === 'fa' ? 'rtl' : 'ltr'}
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div style={{ marginBottom: '0.75rem' }}>
            <span
              className="badge"
              style={{ textTransform: 'uppercase', marginRight: '0.5rem' }}
            >
              Status: {data.status}
            </span>
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              Revision: {data.revision} | Updated: {data.updatedAt}
            </span>
          </div>

          <TextField
            id="locBrandName"
            label="Locale display name"
            defaultValue={data.brandName}
          />
          <TextField
            id="locTagline"
            label="Localized tagline"
            defaultValue={data.tagline}
          />
          <TextField
            id="locSeoTitle"
            label="SEO title"
            defaultValue={data.seo?.title ?? ''}
          />
          <TextareaField
            id="locSeoDescription"
            label="SEO description"
            defaultValue={data.seo?.description ?? ''}
          />
          <TextareaField
            id="locFooterText"
            label="Footer text"
            defaultValue={data.footerText}
          />

          <fieldset
            style={{
              border: '1px solid var(--border, #ccc)',
              padding: '1rem',
              margin: '1rem 0',
            }}
          >
            <legend style={{ fontWeight: 'bold' }}>Scene presets (§I04)</legend>
            <SelectField
              id="graphPreset"
              label="Graph scene preset"
              defaultValue={data.scene?.graphPreset ?? 'atlas-v2'}
              options={[{ value: 'atlas-v2', label: 'Atlas V2 (atlas-v2)' }]}
            />
            <SelectField
              id="portalPreset"
              label="Portal preset"
              defaultValue={data.scene?.portalPreset ?? 'arch-v2'}
              options={[{ value: 'arch-v2', label: 'Arch V2 (arch-v2)' }]}
            />
            <SelectField
              id="motion"
              label="Procedural motion"
              defaultValue={data.scene?.motion ?? 'full'}
              options={[
                { value: 'full', label: 'Full motion' },
                { value: 'reduced', label: 'Reduced motion' },
                { value: 'off', label: 'Off' },
              ]}
            />
            <SelectField
              id="density"
              label="Visual density"
              defaultValue={data.scene?.density ?? 'standard'}
              options={[
                { value: 'standard', label: 'Standard' },
                { value: 'low', label: 'Low' },
              ]}
            />
          </fieldset>

          <fieldset
            style={{
              border: '1px solid var(--border, #ccc)',
              padding: '1rem',
              margin: '1rem 0',
            }}
          >
            <legend style={{ fontWeight: 'bold' }}>
              Audience entry links (§I04)
            </legend>
            <TextField
              id="audResearchLabel"
              label="Research audience label"
              defaultValue={
                data.audienceLinks?.find((l) => l.kind === 'research')?.label ??
                ''
              }
            />
            <TextField
              id="audResearchHref"
              label="Research audience destination URL"
              defaultValue={
                data.audienceLinks?.find((l) => l.kind === 'research')?.href ??
                ''
              }
            />
            <TextField
              id="audEmploymentLabel"
              label="Employment audience label"
              defaultValue={
                data.audienceLinks?.find((l) => l.kind === 'employment')
                  ?.label ?? ''
              }
            />
            <TextField
              id="audEmploymentHref"
              label="Employment audience destination URL"
              defaultValue={
                data.audienceLinks?.find((l) => l.kind === 'employment')
                  ?.href ?? ''
              }
            />
          </fieldset>

          <fieldset
            style={{
              border: '1px solid var(--border, #ccc)',
              padding: '1rem',
              margin: '1rem 0',
            }}
          >
            <legend style={{ fontWeight: 'bold' }}>
              Navigation links (§I04)
            </legend>
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              Order and target paths for the primary header and footer
              navigation (maximum 20 links).
            </p>
            {navLinks.length === 0 ? (
              <p className="admin-empty">No navigation links defined.</p>
            ) : (
              <div
                className="admin-table-scroll"
                role="region"
                aria-label="Navigation links"
                tabIndex={0}
              >
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Label</th>
                      <th scope="col">Destination URL / Path</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {navLinks.map((link, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>
                          <input
                            type="text"
                            aria-label={`Navigation link ${idx + 1} label`}
                            value={link.label}
                            onChange={(e) => {
                              const next = [...navLinks]
                              next[idx] = {
                                ...next[idx],
                                label: e.target.value,
                              }
                              setNavLinks(next)
                            }}
                            className="admin-input"
                            style={{ width: '100%' }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            aria-label={`Navigation link ${idx + 1} destination`}
                            value={link.href}
                            onChange={(e) => {
                              const next = [...navLinks]
                              next[idx] = { ...next[idx], href: e.target.value }
                              setNavLinks(next)
                            }}
                            className="admin-input"
                            style={{ width: '100%' }}
                          />
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="admin-button admin-button--secondary"
                            disabled={idx === 0}
                            onClick={() => {
                              const next = [...navLinks]
                              const temp = next[idx - 1]
                              next[idx - 1] = next[idx]
                              next[idx] = temp
                              setNavLinks(next)
                            }}
                            style={{ marginRight: '0.25rem' }}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="admin-button admin-button--secondary"
                            disabled={idx === navLinks.length - 1}
                            onClick={() => {
                              const next = [...navLinks]
                              const temp = next[idx + 1]
                              next[idx + 1] = next[idx]
                              next[idx] = temp
                              setNavLinks(next)
                            }}
                            style={{ marginRight: '0.25rem' }}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="admin-button admin-button--secondary"
                            onClick={() => {
                              setNavLinks(navLinks.filter((_, i) => i !== idx))
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {navLinks.length < 20 ? (
              <button
                type="button"
                className="admin-button admin-button--secondary"
                onClick={() =>
                  setNavLinks([...navLinks, { label: '', href: '' }])
                }
                style={{ marginTop: '0.5rem' }}
              >
                + Add navigation link
              </button>
            ) : null}
          </fieldset>

          <fieldset
            style={{
              border: '1px solid var(--border, #ccc)',
              padding: '1rem',
              margin: '1rem 0',
            }}
          >
            <legend style={{ fontWeight: 'bold' }}>
              Managed copy & UI text (§I04)
            </legend>
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              Editable interface strings, action labels, and section copy stored
              in CMS dictionary.
            </p>
            {copyEntries.length === 0 ? (
              <p className="admin-empty">No copy entries defined.</p>
            ) : (
              <div
                className="admin-table-scroll"
                role="region"
                aria-label="Content copy entries"
                tabIndex={0}
              >
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th scope="col">Key</th>
                      <th scope="col">Text value</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {copyEntries.map((entry, idx) => (
                      <tr key={idx}>
                        <td style={{ verticalAlign: 'top', width: '35%' }}>
                          <input
                            type="text"
                            aria-label={`Copy entry ${idx + 1} key`}
                            placeholder="e.g. hero.cta.read"
                            value={entry.key}
                            onChange={(e) => {
                              const next = [...copyEntries]
                              next[idx] = { ...next[idx], key: e.target.value }
                              setCopyEntries(next)
                            }}
                            className="admin-input"
                            style={{ width: '100%', fontFamily: 'monospace' }}
                          />
                        </td>
                        <td style={{ verticalAlign: 'top' }}>
                          <textarea
                            aria-label={`Copy entry ${idx + 1} value`}
                            rows={2}
                            value={entry.value}
                            onChange={(e) => {
                              const next = [...copyEntries]
                              next[idx] = {
                                ...next[idx],
                                value: e.target.value,
                              }
                              setCopyEntries(next)
                            }}
                            className="admin-input"
                            style={{ width: '100%' }}
                          />
                        </td>
                        <td style={{ verticalAlign: 'top', width: '10%' }}>
                          <button
                            type="button"
                            className="admin-button admin-button--secondary"
                            onClick={() => {
                              setCopyEntries(
                                copyEntries.filter((_, i) => i !== idx),
                              )
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {copyEntries.length < 1500 ? (
              <button
                type="button"
                className="admin-button admin-button--secondary"
                onClick={() =>
                  setCopyEntries([...copyEntries, { key: '', value: '' }])
                }
                style={{ marginTop: '0.5rem' }}
              >
                + Add copy entry
              </button>
            ) : null}
          </fieldset>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              type="submit"
              className="admin-button"
              disabled={update.isPending}
            >
              {update.isPending ? 'Saving draft…' : 'Save draft'}
            </button>
            <button
              type="button"
              className="admin-button admin-button--secondary"
              disabled={publish.isPending}
              onClick={() => void handlePublish()}
            >
              {publish.isPending ? 'Publishing…' : 'Publish localized settings'}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  )
}
