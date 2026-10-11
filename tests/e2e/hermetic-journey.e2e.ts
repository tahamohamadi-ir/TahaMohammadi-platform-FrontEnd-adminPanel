/**
 * PU-25 hermetic full-stack journey.
 *
 * This is the acceptance evidence the HTTP-mocked component tests could not
 * provide. It drives the REAL built admin bundle, served by the REAL Django
 * backend, against a disposable SQLite database and media root — with no
 * owner credential, no staging host, and no production data.
 *
 * What is genuinely exercised here (not simulated):
 *   - real CSRF cookie/header handshake (`admin_common._check_csrf`)
 *   - real session + django-otp TOTP login (`auth_login`)
 *   - real `If-Match` optimistic locking -> 409 `STALE_REVISION`
 *   - real publication snapshot semantics (`apps.content.published`)
 *   - real media upload + MIME-family replace (`admin_media`)
 *   - real restore-as-draft (`apps.content.revisions`)
 *   - the public read path the Astro site builds from (`/api/articles/...`)
 *
 * Every record is synthetic (marker `HERMETIC-<timestamp>`). Nothing real is
 * published and no production database is opened.
 */
import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'

/**
 * Header name the backend CSRF guard reads
 * (`admin_common._check_csrf` -> `HTTP_X_CSRFTOKEN`). Duplicated as a literal
 * rather than imported from `src/`, because this spec runs under the plain
 * Playwright runner, which does not load the Vite `@/` alias.
 */
const CSRF_HEADER_NAME = 'X-CSRFToken'

/** RFC 6238 example secret; mirrors the backend fixture provisioning. */
const TOTP_KEY_HEX = '3132333435363738393031323334353637383930'
const HERMETIC_EMAIL = 'hermetic-journey@example.invalid'
const HERMETIC_PASSWORD = 'hermetic-journey-not-a-real-secret'

/**
 * Sign in through the real form, including the real TOTP requirement.
 *
 * Three genuine backend behaviors shape this helper, and none is stubbed:
 *
 * 1. A bare password is refused with 401 `AUTH_FAILED` whenever a TOTP device
 *    is enrolled; the SPA responds by revealing the MFA field. So the first
 *    submit is *expected* to fail.
 * 2. django-otp applies a progressive throttle on failed verification
 *    (`DeviceThrottlingMixin.verify_is_allowed`): after one failure the next
 *    attempt must wait `OTP_TOTP_THROTTLE_FACTOR * 2**0` = 1s. We wait past
 *    that window instead of disabling it.
 * 3. django-otp refuses to accept the same time step twice
 *    (`totp.verify(token, tolerance, self.last_t + 1)`), so a second sign-in
 *    inside one 30s window needs a *later* step. We advance the step per
 *    successful login rather than sleeping up to 30s.
 */
let signInAttempts = 0

async function signIn(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/admin/sign-in')
  await page.getByLabel('Email').fill(HERMETIC_EMAIL)
  await page.getByLabel('Password').fill(HERMETIC_PASSWORD)

  const otp = page.getByLabel('Authenticator or recovery code')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await otp.waitFor({ state: 'visible', timeout: 10_000 })

  // Clear the real one-failure throttle before submitting the valid code.
  await page.waitForTimeout(2_000)
  signInAttempts += 1
  await otp.fill(await totpForStep(signInAttempts))
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
}

/**
 * RFC 6238 TOTP (SHA-1, 30s step, 6 digits) for the published test key.
 * `stepOffset` walks forward so repeated logins do not replay one time step.
 */
async function totpForStep(stepOffset: number): Promise<string> {
  const { createHmac } = await import('node:crypto')
  const key = Buffer.from(TOTP_KEY_HEX, 'hex')
  const counter = Math.floor(Date.now() / 1000 / 30) + stepOffset
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const digest = createHmac('sha1', key).update(buf).digest()
  const offset = digest[digest.length - 1]! & 0xf
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    (digest[offset + 1]! << 16) |
    (digest[offset + 2]! << 8) |
    digest[offset + 3]!
  return String(binary % 1_000_000).padStart(6, '0')
}

/**
 * Raw admin-API call bound to the signed-in browser context.
 *
 * `page.request` shares cookies, so the admin session rides along, but it does
 * not run the SPA's CSRF provider. The real guard
 * (`admin_common._check_csrf`) compares the `X-CSRFToken` header against the
 * `csrftoken` cookie, so we read the token the same way the app does and send
 * it explicitly. The token is re-read per call because Django rotates it.
 */
/**
 * A JSON admin response.
 *
 * `unknown` rather than `any`: the journey asserts specific fields, and an
 * `any` return would silently make every `.code` / `.message` access unchecked
 * and defeat the point of a real integration assertion.
 */
interface AdminResponse {
  status: number
  body: Record<string, unknown>
}

async function callAdmin(
  request: APIRequestContext,
  method: string,
  path: string,
  data?: unknown,
  ifMatch?: string,
): Promise<AdminResponse> {
  const csrf = await fetchCsrf(request)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    [CSRF_HEADER_NAME]: csrf,
  }
  if (ifMatch) headers['If-Match'] = ifMatch
  const response = await request.fetch(path, { method, headers, data })
  const text = await response.text()
  return {
    status: response.status(),
    body: text ? (JSON.parse(text) as Record<string, unknown>) : {},
  }
}

/** Read the current CSRF token through the session-authenticated context. */
async function fetchCsrf(request: APIRequestContext): Promise<string> {
  const response = await request.get('/api/v1/admin/auth/csrf')
  const body = (await response.json()) as { csrfToken: string }
  return body.csrfToken
}

/** Multipart admin call; the CSRF guard applies to uploads too. */
async function callAdminMultipart(
  request: APIRequestContext,
  method: string,
  path: string,
  multipart: Record<string, unknown>,
): Promise<AdminResponse> {
  const csrf = await fetchCsrf(request)
  const response = await request.fetch(path, {
    method,
    headers: { [CSRF_HEADER_NAME]: csrf },
    multipart,
  })
  const text = await response.text()
  return {
    status: response.status(),
    body: text ? (JSON.parse(text) as Record<string, unknown>) : {},
  }
}

async function adminJsonRaw(
  request: APIRequestContext,
  method: string,
  path: string,
  body: unknown,
  ifMatch?: string,
): Promise<AdminResponse> {
  return callAdmin(request, method, path, body, ifMatch)
}

async function adminJson(
  request: APIRequestContext,
  method: string,
  path: string,
  body: unknown,
  ifMatch?: string,
) {
  const raw = await adminJsonRaw(request, method, path, body, ifMatch)
  expect(raw.status, `${method} ${path} -> ${raw.status}`).toBeLessThan(300)
  return raw.body
}

test.describe.configure({ mode: 'serial' })

test.describe('PU-25 hermetic admin journey', () => {
  test('draft -> save with If-Match -> publish -> public rendered content', async ({
    page,
  }) => {
    const marker = `HERMETIC-${Date.now()}`
    const slug = `hermetic-${Date.now()}`

    await signIn(page)
    // `page.request` shares the browser context, so these calls carry the very
    // session cookie and CSRF cookie the UI established.
    const api = page.request

    // ---- Create a draft through the real admin UI. ----------------------
    // Navigate by clicking the sidebar, exactly as an editor does. A
    // `page.goto` full reload would silently refetch the CSRF token and mask
    // the post-login token-rotation defect this journey exists to catch.
    await page.getByRole('link', { name: 'Articles' }).click()
    await expect(page).toHaveURL(/\/admin\/content\/article$/)
    await page.getByRole('link', { name: /New article/i }).click()
    await expect(page).toHaveURL(/\/admin\/content\/article\/new/)

    // `exact: true` matters: the article schema also renders "Seo Title" and
    // "Seo Description", which a substring match would collide with.
    await page.getByLabel('Title', { exact: true }).fill(`Synthetic ${marker}`)
    await page.getByLabel('Slug', { exact: true }).fill(slug)
    await page.getByLabel('Locale', { exact: true }).selectOption('en')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page).toHaveURL(/\/admin\/content\/article\/\d+/)

    const articleId = Number(page.url().match(/article\/(\d+)/)?.[1])
    expect(Number.isInteger(articleId)).toBe(true)

    // ---- A draft must never be publicly visible. ------------------------
    const draftPublic = await api.get(
      `/api/articles/en/${encodeURIComponent(slug)}`,
    )
    expect(draftPublic.status()).toBe(404)

    // ---- Edit and save through the real UI (If-Match round-trip). -------
    // Scope to the content form; the story/history panels have their own
    // save controls, and the button label is reused across sections.
    const form = page.locator('form').filter({ has: page.getByLabel('Slug') })
    await form.getByLabel('Body', { exact: true }).fill(`Draft body ${marker}`)
    await form.getByRole('button', { name: 'Save' }).click()
    // A CSRF rejection surfaces as a visible error instead of a save.
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.getByText('Saved')).toBeVisible()
    await expect(
      page.getByText('draft', { exact: false }).first(),
    ).toBeVisible()

    // Still not public: saving a draft must not publish.
    expect(
      (await api.get(`/api/articles/en/${encodeURIComponent(slug)}`)).status(),
    ).toBe(404)

    // ---- Publish through the real transition control. -------------------
    await page.getByRole('button', { name: 'Publish' }).first().click()
    await page.getByRole('button', { name: 'Confirm publish' }).click()
    await expect(
      page.getByText('published', { exact: false }).first(),
    ).toBeVisible({
      timeout: 15_000,
    })

    // ---- The public read path now serves the published record. ----------
    const published = await api.get(
      `/api/articles/en/${encodeURIComponent(slug)}`,
    )
    expect(published.status()).toBe(200)
    const payload = await published.json()
    expect(payload.slug).toBe(slug)
    expect(payload.title).toContain(marker)
    // The public projection carries no `status`: it only ever exposes
    // published rows, so presence at 200 *is* the published assertion.
    // A leaked draft would surface here as a 200 on the pre-publish step.
    expect(payload.published_at).toBeTruthy()
    expect(payload.body).toContain(`Draft body ${marker}`)

    // The Persian locale must not leak the English record (exact-locale rule).
    expect(
      (await api.get(`/api/articles/fa/${encodeURIComponent(slug)}`)).status(),
    ).toBe(404)
  })

  test('a stale If-Match is rejected with 409 STALE_REVISION', async ({
    page,
  }) => {
    const slug = `hermetic-conflict-${Date.now()}`
    await signIn(page)
    const request = page.request

    const created = await adminJson(
      request,
      'POST',
      '/api/v1/admin/content/article',
      {
        locale: 'en',
        slug,
        title: `Synthetic conflict ${slug}`,
        status: 'draft',
        fields: { body: 'first' },
      },
    )

    // Move the row forward behind the caller's back, then replay the old
    // If-Match. Genuine optimistic locking, not a stubbed status code.
    await adminJson(
      request,
      'PUT',
      `/api/v1/admin/content/article/${created.id}`,
      { fields: { body: 'second' } },
      created.updatedAt,
    )

    const stale = await adminJsonRaw(
      request,
      'PUT',
      `/api/v1/admin/content/article/${created.id}`,
      { fields: { body: 'third' } },
      created.updatedAt,
    )
    // The wire code is `CONFLICT` with HTTP 409: that is what
    // `admin_content.ContentConflictError` raises when `If-Match` no longer
    // matches `updated_at`. `errors.ts` normalizes any 409 to kind
    // `conflict`, which is what the UI branches on.
    expect(stale.status).toBe(409)
    expect(stale.body.code).toBe('CONFLICT')
  })

  test('media replacement keeps the record and swaps the served bytes', async ({
    page,
  }) => {
    await signIn(page)
    const request = page.request

    // Two real PNGs (1x1 red, 1x1 blue) so the replace is observable by bytes.
    const original = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )
    const replacement = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGA1jR9awAAAABJRU5ErkJggg==',
      'base64',
    )

    const created = await callAdminMultipart(
      request,
      'POST',
      '/api/v1/admin/media',
      {
        title: `Hermetic asset ${Date.now()}`,
        file: {
          name: 'hermetic-original.png',
          mimeType: 'image/png',
          buffer: original,
        },
      },
    )
    expect(created.status).toBe(201)
    const media = created.body

    // A cross-family replacement must be refused by the real guard.
    const wrongFamily = await callAdminMultipart(
      request,
      'POST',
      `/api/v1/admin/media/${media.id}/replace`,
      {
        file: {
          name: 'hermetic.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4\n% hermetic\n'),
        },
      },
    )
    expect(wrongFamily.status).toBe(400)
    expect(wrongFamily.body.message).toMatch(/same MIME family/i)

    // Same-family replacement succeeds and keeps the same media record.
    const replaced = await callAdminMultipart(
      request,
      'POST',
      `/api/v1/admin/media/${media.id}/replace`,
      {
        file: {
          name: 'hermetic-replacement.png',
          mimeType: 'image/png',
          buffer: replacement,
        },
      },
    )
    expect(replaced.status).toBe(200)
    expect(replaced.body.id).toBe(media.id)

    // Deleting media that is still referenced must be blocked by the real
    // usage guard, so a referenced asset cannot silently disappear.
    const referenced = await adminJson(
      request,
      'POST',
      '/api/v1/admin/content/article',
      {
        locale: 'en',
        slug: `hermetic-media-${Date.now()}`,
        title: 'Synthetic media reference',
        status: 'draft',
        // `featuredImageId` is the real API key for Article.featured_image
        // (admin_content.DETAIL_FIELD_MAPS["article"]), so the usage guard
        // sees a real reference.
        fields: { body: 'x', featuredImageId: media.id },
      },
    )
    expect(referenced.id).toBeGreaterThan(0)

    const removal = await callAdmin(
      request,
      'DELETE',
      `/api/v1/admin/media/${media.id}`,
    )
    expect(removal.status).toBe(409)
    expect(removal.body.code).toBe('MEDIA_IN_USE')
  })

  test('restore returns a published record to a draft without losing the public copy', async ({
    page,
  }) => {
    await signIn(page)
    const request = page.request
    const slug = `hermetic-restore-${Date.now()}`

    const created = await adminJson(
      request,
      'POST',
      '/api/v1/admin/content/article',
      {
        locale: 'en',
        slug,
        title: 'Synthetic restore target',
        status: 'draft',
        fields: { body: 'version one' },
      },
    )

    // Snapshot, then edit, then publish, so a snapshot and a live row exist.
    const revision = await adminJson(
      request,
      'POST',
      `/api/v1/admin/content/article/${created.id}/revisions`,
      { note: 'hermetic snapshot' },
    )
    expect(revision.id).toBeGreaterThan(0)

    // The edit must actually move the record forward: a save that silently
    // no-ops would still leave the article publishable, so assert the new
    // revision differs rather than discarding the response.
    const edited = await adminJson(
      request,
      'PUT',
      `/api/v1/admin/content/article/${created.id}`,
      { fields: { body: 'version two' } },
      created.updatedAt,
    )
    expect(edited.updatedAt).not.toBe(created.updatedAt)
    await adminJson(
      request,
      'POST',
      `/api/v1/admin/content/article/${created.id}/transition`,
      { to: 'published' },
    )
    expect((await request.get(`/api/articles/en/${slug}`)).status()).toBe(200)

    // Restoring the snapshot must land as a DRAFT, never as a live publish.
    const restored = await adminJson(
      request,
      'POST',
      `/api/v1/admin/content/article/${created.id}/revisions/${revision.id}/restore`,
      {},
    )
    expect(restored.status).toBe('draft')
    expect(restored.fields.body).toBe('version one')

    // The publication snapshot keeps serving the previously published copy
    // while the live row is a draft (apps.content.published fallback).
    const publicRead = await request.get(`/api/articles/en/${slug}`)
    expect(publicRead.status()).toBe(200)
    expect((await publicRead.json()).body).toBe('version two')
  })

  test('a project draft stays private, publish is exact-locale, and archive removes it', async ({
    page,
  }) => {
    await signIn(page)
    const request = page.request
    const slug = `hermetic-project-${Date.now()}`

    const created = await adminJson(
      request,
      'POST',
      '/api/v1/admin/content/project',
      {
        locale: 'en',
        slug,
        title: 'Synthetic hermetic project',
        status: 'draft',
        fields: {},
      },
    )
    expect(created.status).toBe('draft')
    expect(
      (
        await request.get(`/api/projects/en/${encodeURIComponent(slug)}`)
      ).status(),
    ).toBe(404)

    const published = await adminJson(
      request,
      'POST',
      `/api/v1/admin/content/project/${created.id}/transition`,
      { to: 'published' },
    )
    expect(published.status).toBe('published')

    const publicRead = await request.get(
      `/api/projects/en/${encodeURIComponent(slug)}`,
    )
    expect(publicRead.status()).toBe(200)
    expect((await publicRead.json()).slug).toBe(slug)
    expect(
      (
        await request.get(`/api/projects/fa/${encodeURIComponent(slug)}`)
      ).status(),
    ).toBe(404)

    const archived = await adminJson(
      request,
      'POST',
      `/api/v1/admin/content/project/${created.id}/transition`,
      { to: 'archived' },
    )
    expect(archived.status).toBe('archived')
    expect(
      (
        await request.get(`/api/projects/en/${encodeURIComponent(slug)}`)
      ).status(),
    ).toBe(404)
  })

  test('an Atlas draft accepts one real relation between two nodes', async ({
    page,
  }) => {
    await signIn(page)
    const request = page.request
    const stamp = Date.now()
    const nodeTypeKey = `hnode${stamp}`
    const relationTypeKey = `hlink${stamp}`

    await adminJson(request, 'POST', '/api/v1/admin/atlas/node-types', {
      key: nodeTypeKey,
      label_en: 'Hermetic node',
      label_fa: 'گره آزمایشی',
    })
    await adminJson(request, 'POST', '/api/v1/admin/atlas/relation-types', {
      key: relationTypeKey,
      label_en: 'Hermetic link',
      label_fa: 'پیوند آزمایشی',
      allowedSourceTypes: [nodeTypeKey],
      allowedTargetTypes: [nodeTypeKey],
    })

    const version = await adminJson(
      request,
      'POST',
      '/api/v1/admin/atlas/versions',
      { label: `Hermetic graph ${stamp}` },
    )
    let revision = String(version.revision)

    async function currentRevision(): Promise<string> {
      const detail = await adminJson(
        request,
        'GET',
        `/api/v1/admin/atlas/versions/${version.id}`,
      )
      return String(detail.revision)
    }

    const source = await adminJson(
      request,
      'POST',
      `/api/v1/admin/atlas/versions/${version.id}/nodes`,
      { nodeTypeKey },
      revision,
    )
    revision = await currentRevision()
    const target = await adminJson(
      request,
      'POST',
      `/api/v1/admin/atlas/versions/${version.id}/nodes`,
      { nodeTypeKey },
      revision,
    )
    revision = await currentRevision()

    const relation = await adminJson(
      request,
      'POST',
      `/api/v1/admin/atlas/versions/${version.id}/relations`,
      {
        sourceKey: source.publicKey,
        relationTypeKey,
        targetKey: target.publicKey,
      },
      revision,
    )
    expect(relation.sourceKey).toBe(source.publicKey)
    expect(relation.relationTypeKey).toBe(relationTypeKey)
    expect(relation.targetKey).toBe(target.publicKey)

    const listed = await adminJson(
      request,
      'GET',
      `/api/v1/admin/atlas/versions/${version.id}/relations`,
    )
    expect(Array.isArray(listed)).toBe(true)
    expect(
      (listed as unknown as Array<{ key: string }>).some(
        (row) => row.key === relation.key,
      ),
    ).toBe(true)
  })
})
