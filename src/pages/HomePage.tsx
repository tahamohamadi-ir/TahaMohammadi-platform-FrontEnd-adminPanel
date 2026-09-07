import { useEffect, useState } from 'react'

import { AdminNav, ADMIN_NAV_ITEMS, filterNavItems } from '@/components/Nav'
import { Notice, SelectField, TextField } from '@/components/ui/primitives'
import { AdminApiError } from '@/lib/api/auth'
import {
  CANONICAL_MODULE_KEYS,
  SELECTION_MODES,
  type HomeModuleIn,
  type HomeModulesPutIn,
} from '@/lib/api/home'
import {
  useHomeModules,
  useSaveHomeModules,
  useValidateHomeModules,
} from '@/lib/api/hooks/useHome'
import {
  useLocalizedSiteSettings,
  useUpdateLocalizedSiteSettings,
} from '@/lib/api/hooks/useSiteSettings'
import { useAuth } from '@/lib/auth/AuthProvider'

/** Locale switch shared by composition-style pages. */
export function LocaleTabs({
  locale,
  onChange,
}: {
  locale: 'en' | 'fa'
  onChange: (locale: 'en' | 'fa') => void
}) {
  return (
    <div role="tablist" aria-label="Locale" className="admin-nav">
      {(['en', 'fa'] as const).map((value) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={locale === value}
          className="admin-nav__link"
          onClick={() => onChange(value)}
        >
          {value === 'en' ? 'English' : 'فارسی'}
        </button>
      ))}
    </div>
  )
}

/** Home module composition & audience paths (ADMIN-190 / PU-12-home).
 * Full-array bulk save with the locale-level If-Match revision; server-side dry-run validate before save.
 * Module keys come from the backend's canonical set — the page never invents a slot or fake featured records.
 * Audience entry paths (research and employment) are managed per locale without hardcoded assumptions. */
export function HomePage() {
  const { user } = useAuth()
  const [locale, setLocale] = useState<'en' | 'fa'>('en')
  const [draft, setDraft] = useState<HomeModuleIn[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Audience links state
  const [audienceResearchLabel, setAudienceResearchLabel] = useState('')
  const [audienceResearchHref, setAudienceResearchHref] = useState('')
  const [audienceEmploymentLabel, setAudienceEmploymentLabel] = useState('')
  const [audienceEmploymentHref, setAudienceEmploymentHref] = useState('')
  const [audienceMessage, setAudienceMessage] = useState<string | null>(null)
  const [audienceError, setAudienceError] = useState<string | null>(null)

  const modules = useHomeModules(locale)
  const validate = useValidateHomeModules(locale)
  const save = useSaveHomeModules(locale)

  const settingsQuery = useLocalizedSiteSettings(locale)
  const updateSettings = useUpdateLocalizedSiteSettings(locale)

  const data = modules.data
  const current: HomeModuleIn[] =
    draft ??
    data?.modules.map((module) => ({
      key: module.key,
      visible: module.visible,
      order: module.order,
      selection_mode: module.selection_mode,
      provenance_note: module.provenance_note,
    })) ??
    []

  // Sync audience links from settings
  useEffect(() => {
    if (settingsQuery.data?.audienceLinks) {
      const researchLink = settingsQuery.data.audienceLinks.find(
        (l) => l.kind === 'research',
      )
      const employmentLink = settingsQuery.data.audienceLinks.find(
        (l) => l.kind === 'employment',
      )
      setAudienceResearchLabel(
        researchLink?.label ??
          (locale === 'fa' ? 'جهت‌گیری پژوهشی' : 'Research Profile'),
      )
      setAudienceResearchHref(researchLink?.href ?? `/${locale}/research`)
      setAudienceEmploymentLabel(
        employmentLink?.label ??
          (locale === 'fa' ? 'مهندسی و سیستم‌ها' : 'Selected Engineering'),
      )
      setAudienceEmploymentHref(employmentLink?.href ?? `/${locale}/projects`)
    } else {
      setAudienceResearchLabel(
        locale === 'fa' ? 'جهت‌گیری پژوهشی' : 'Research Profile',
      )
      setAudienceResearchHref(`/${locale}/research`)
      setAudienceEmploymentLabel(
        locale === 'fa' ? 'مهندسی و سیستم‌ها' : 'Selected Engineering',
      )
      setAudienceEmploymentHref(`/${locale}/projects`)
    }
  }, [settingsQuery.data, locale])

  function updateModule(index: number, patch: Partial<HomeModuleIn>) {
    setDraft(
      current.map((module, at) =>
        at === index ? { ...module, ...patch } : module,
      ),
    )
    setMessage(null)
    setError(null)
  }

  function moveModule(index: number, delta: -1 | 1) {
    const target = index + delta
    if (target < 0 || target >= current.length) return
    const next = [...current]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved!)
    setDraft(next.map((module, at) => ({ ...module, order: at + 1 })))
    setMessage(null)
    setError(null)
  }

  function addCanonicalModule(key: string) {
    if (current.some((m) => m.key === key)) return
    setDraft([
      ...current,
      {
        key,
        visible: false,
        order: current.length + 1,
        selection_mode: 'manual',
        provenance_note: '',
      },
    ])
    setMessage(null)
    setError(null)
  }

  function payload(): HomeModulesPutIn {
    return {
      modules: current.map((module, at) => ({
        ...module,
        order: at + 1,
      })),
    }
  }

  async function handleValidate() {
    setError(null)
    try {
      await validate.mutateAsync(payload())
      setMessage('Composition is valid.')
    } catch (caught) {
      setMessage(null)
      setError(
        caught instanceof AdminApiError
          ? `${caught.message} ${Object.entries(caught.fieldErrors)
              .map(([path, why]) => `${path}: ${why}`)
              .join(' · ')}`
          : 'Validation failed. Try again.',
      )
    }
  }

  async function handleSave() {
    setError(null)
    if (!data) return
    try {
      await save.mutateAsync({ payload: payload(), ifMatch: data.revision })
      setDraft(null)
      setMessage('Composition saved.')
    } catch (caught) {
      setMessage(null)
      if (caught instanceof AdminApiError && caught.kind === 'conflict') {
        setError('The composition changed elsewhere. Reload latest and retry.')
        return
      }
      setError(
        caught instanceof AdminApiError
          ? caught.message
          : 'Save failed. Try again.',
      )
    }
  }

  async function handleSaveAudienceLinks(e: React.FormEvent) {
    e.preventDefault()
    setAudienceMessage(null)
    setAudienceError(null)

    if (!audienceResearchLabel.trim() || !audienceEmploymentLabel.trim()) {
      setAudienceError('Both audience link labels are required.')
      return
    }

    if (
      !audienceResearchHref.startsWith(`/${locale}`) ||
      !audienceEmploymentHref.startsWith(`/${locale}`)
    ) {
      setAudienceError(
        `Audience links must be locale-prefixed routes starting with /${locale}.`,
      )
      return
    }

    const ifMatch = settingsQuery.data?.revision
    if (!ifMatch) {
      setAudienceError('Site settings revision unavailable. Please refresh.')
      return
    }

    try {
      await updateSettings.mutateAsync({
        payload: {
          audienceLinks: [
            {
              kind: 'research',
              label: audienceResearchLabel.trim(),
              href: audienceResearchHref.trim(),
            },
            {
              kind: 'employment',
              label: audienceEmploymentLabel.trim(),
              href: audienceEmploymentHref.trim(),
            },
          ],
        },
        ifMatch,
      })
      setAudienceMessage('Audience entry links saved.')
    } catch (caught) {
      setAudienceError(
        caught instanceof AdminApiError
          ? caught.message
          : 'Failed to save audience links.',
      )
    }
  }

  const missingCanonicalKeys = CANONICAL_MODULE_KEYS.filter(
    (key) => !current.some((m) => m.key === key),
  )

  return (
    <main className="page">
      <AdminNav items={filterNavItems(ADMIN_NAV_ITEMS, user)} />
      <h1>Home composition</h1>
      <LocaleTabs
        locale={locale}
        onChange={(next) => {
          setLocale(next)
          setDraft(null)
          setMessage(null)
          setError(null)
          setAudienceMessage(null)
          setAudienceError(null)
        }}
      />

      {message ? <p role="status">{message}</p> : null}
      {error ? (
        <Notice tone="error" title="Action failed">
          {error}{' '}
          <button
            type="button"
            className="admin-button admin-button--secondary"
            onClick={() => {
              setError(null)
              setDraft(null)
              void modules.refetch()
            }}
          >
            Reload latest
          </button>
        </Notice>
      ) : null}

      {modules.isPending ? <p role="status">Loading composition…</p> : null}
      {modules.error ? (
        <Notice tone="error" title="Composition unavailable">
          The backend did not answer.{' '}
          <button
            type="button"
            className="admin-button admin-button--secondary"
            onClick={() => void modules.refetch()}
          >
            Retry
          </button>
        </Notice>
      ) : null}

      {data ? (
        <section aria-labelledby="modules-heading">
          <h2 id="modules-heading">Module selection and order</h2>
          <p className="muted">
            Configure the vertical sequence and content selection mode of home
            modules for this locale. Only canonical modules are permitted; no
            unverified featured records are injected.
          </p>

          <ol className="admin-home-modules">
            {current.map((module, index) => (
              <li key={module.key} className="admin-home-module">
                <div>
                  <strong>{module.key}</strong>{' '}
                  <span className="muted">order {index + 1}</span>
                </div>
                <label>
                  <input
                    type="checkbox"
                    checked={module.visible}
                    onChange={(event) =>
                      updateModule(index, {
                        visible: event.currentTarget.checked,
                      })
                    }
                  />{' '}
                  Visible
                </label>
                <SelectField
                  id={`mode-${module.key}`}
                  label="Selection mode"
                  value={module.selection_mode}
                  onChange={(value) =>
                    updateModule(index, { selection_mode: value })
                  }
                  options={SELECTION_MODES.map((value) => ({
                    value,
                    label: value,
                  }))}
                />
                <TextField
                  id={`note-${module.key}`}
                  label="Provenance note"
                  value={module.provenance_note}
                  onChange={(value) =>
                    updateModule(index, { provenance_note: value })
                  }
                />
                <button
                  type="button"
                  className="admin-button admin-button--secondary"
                  disabled={index === 0}
                  onClick={() => moveModule(index, -1)}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className="admin-button admin-button--secondary"
                  disabled={index === current.length - 1}
                  onClick={() => moveModule(index, 1)}
                >
                  Move down
                </button>
              </li>
            ))}
          </ol>

          {missingCanonicalKeys.length > 0 ? (
            <div style={{ margin: '1rem 0' }}>
              <span className="muted">Add missing canonical module: </span>
              {missingCanonicalKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  className="admin-button admin-button--secondary"
                  style={{ marginRight: '0.5rem', marginBottom: '0.5rem' }}
                  onClick={() => addCanonicalModule(key)}
                >
                  + {key}
                </button>
              ))}
            </div>
          ) : null}

          <p>
            <button
              type="button"
              className="admin-button admin-button--secondary"
              disabled={validate.isPending}
              onClick={() => void handleValidate()}
            >
              Validate
            </button>{' '}
            <button
              type="button"
              className="admin-button"
              disabled={save.isPending}
              onClick={() => void handleSave()}
            >
              {save.isPending ? 'Saving…' : 'Save composition'}
            </button>
          </p>
        </section>
      ) : null}

      <section
        aria-labelledby="audience-heading"
        style={{
          marginTop: '2.5rem',
          borderTop: '1px solid var(--border, #ccc)',
          paddingTop: '1.5rem',
        }}
      >
        <h2 id="audience-heading">Audience entry links</h2>
        <p className="muted">
          Two dedicated audience paths for {locale.toUpperCase()}: Research
          (academic / PhD supervisors) and Employment (collaborators /
          industry).
        </p>

        {audienceMessage ? <p role="status">{audienceMessage}</p> : null}
        {audienceError ? (
          <Notice tone="error" title="Audience links update failed">
            {audienceError}
          </Notice>
        ) : null}

        <form onSubmit={(e) => void handleSaveAudienceLinks(e)}>
          <fieldset
            style={{
              border: '1px solid var(--border, #ccc)',
              padding: '1rem',
              borderRadius: '4px',
              marginBottom: '1rem',
            }}
          >
            <legend>
              <strong>Research audience path</strong>
            </legend>
            <TextField
              id="audience-research-label"
              label="Label"
              value={audienceResearchLabel}
              onChange={setAudienceResearchLabel}
            />
            <TextField
              id="audience-research-href"
              label="Destination URL"
              value={audienceResearchHref}
              onChange={setAudienceResearchHref}
            />
          </fieldset>

          <fieldset
            style={{
              border: '1px solid var(--border, #ccc)',
              padding: '1rem',
              borderRadius: '4px',
              marginBottom: '1rem',
            }}
          >
            <legend>
              <strong>Employment audience path</strong>
            </legend>
            <TextField
              id="audience-employment-label"
              label="Label"
              value={audienceEmploymentLabel}
              onChange={setAudienceEmploymentLabel}
            />
            <TextField
              id="audience-employment-href"
              label="Destination URL"
              value={audienceEmploymentHref}
              onChange={setAudienceEmploymentHref}
            />
          </fieldset>

          <button
            type="submit"
            className="admin-button"
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending ? 'Saving…' : 'Save audience links'}
          </button>
        </form>
      </section>
    </main>
  )
}
