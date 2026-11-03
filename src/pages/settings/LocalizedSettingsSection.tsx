import { useEffect, useState } from 'react'

import {
  Notice,
  TextareaField,
  TextField,
  ValidationSummary,
  type ValidationIssue,
} from '@/components/ui/primitives'
import { LoadingState } from '@/components/ui/states'
import { AdminApiError } from '@/lib/api/auth'
import {
  useLocalizedSiteSettings,
  usePublishLocalizedSiteSettings,
  useUpdateLocalizedSiteSettings,
} from '@/lib/api/hooks/useSiteSettings'
import {
  AudienceLinksFieldset,
  CopyEntriesFieldset,
  HomeHeroFieldset,
  NavLinksFieldset,
  ScenePresetsFieldset,
  type CopyEntryDraft,
  type NavLinkDraft,
} from '@/pages/settings/LocalizedFieldsets'

/** Per-locale site identity, scene presets, navigation and managed copy:
 * draft save with If-Match, then an explicit publish. */
export function LocalizedSettingsSection() {
  const [locale, setLocale] = useState<'en' | 'fa'>('en')
  const localized = useLocalizedSiteSettings(locale)
  const update = useUpdateLocalizedSiteSettings(locale)
  const publish = usePublishLocalizedSiteSettings(locale)
  const [conflict, setConflict] = useState(false)
  const [saved, setSaved] = useState(false)
  const [published, setPublished] = useState(false)
  const [issues, setIssues] = useState<ValidationIssue[]>([])
  const [navLinks, setNavLinks] = useState<NavLinkDraft[]>([])
  const [copyEntries, setCopyEntries] = useState<CopyEntryDraft[]>([])
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

  function selectLocale(next: 'en' | 'fa') {
    setLocale(next)
    setSaved(false)
    setPublished(false)
    setConflict(false)
  }

  return (
    <section
      aria-labelledby="localized-settings-title"
      className="admin-section"
    >
      <h2 id="localized-settings-title">
        Localized site identity & scene presets
      </h2>
      <div role="tablist" aria-label="Settings locale" className="admin-tabs">
        <button
          type="button"
          role="tab"
          aria-selected={locale === 'en'}
          className="admin-tab"
          onClick={() => selectLocale('en')}
        >
          English (en)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={locale === 'fa'}
          className="admin-tab"
          onClick={() => selectLocale('fa')}
        >
          فارسی (fa)
        </button>
      </div>

      {localized.isPending ? (
        <LoadingState label="Loading localized settings…" variant="form" />
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
          lang={locale}
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="admin-meta">
            <span className="badge uppercase">Status: {data.status}</span>
            <span className="muted">
              Revision: {data.revision} | Updated: {data.updatedAt}
            </span>
          </div>

          <HomeHeroFieldset
            data={data}
            copyEntries={copyEntries}
            setCopyEntries={setCopyEntries}
          />

          <div className="admin-panel">
            <div className="grid gap-x-6 xl:grid-cols-2">
              <TextField
                id="locSeoTitle"
                label="SEO title"
                defaultValue={data.seo?.title ?? ''}
              />
            </div>
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
          </div>

          <ScenePresetsFieldset data={data} />
          <AudienceLinksFieldset data={data} />
          <NavLinksFieldset navLinks={navLinks} setNavLinks={setNavLinks} />
          <CopyEntriesFieldset
            copyEntries={copyEntries}
            setCopyEntries={setCopyEntries}
          />

          <div className="admin-actions">
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
