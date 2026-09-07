/**
 * PU-25 live publication journey (CM-07).
 *
 * End-to-end proof that an admin edit reaches the public site:
 * login -> create article draft (unique marker) -> edit (If-Match) ->
 * publish transition -> poll public staging URL for the marker ->
 * archive cleanup.
 *
 * GATED: runs only when the staging environment is configured; otherwise
 * the suite skips honestly and proves nothing. Required env:
 *   ADMIN_JOURNEY_ADMIN_URL  e.g. https://staging.example/api/v1/admin
 *   ADMIN_JOURNEY_PUBLIC_URL e.g. https://staging.example
 *   ADMIN_JOURNEY_EMAIL / ADMIN_JOURNEY_PASSWORD (+ ADMIN_JOURNEY_OTP when enrolled)
 *
 * Notes:
 * - No test data is invented on a developer machine: without env, zero
 *   requests are issued.
 * - Staging must rebuild static output after publish (runner or manual);
 *   the poll step waits up to 10 minutes and fails with an explicit
 *   message when the marker never renders.
 * - Cleanup transitions the marker article back to `archived` in a
 *   finally block; there is no admin DELETE endpoint by design.
 * - Approval gates (if enabled on staging) surface as explicit failures,
 *   never silent passes.
 */
import { expect, test } from '@playwright/test'

const ADMIN_URL = (process.env.ADMIN_JOURNEY_ADMIN_URL ?? '').replace(/\/$/, '')
const PUBLIC_URL = (process.env.ADMIN_JOURNEY_PUBLIC_URL ?? '').replace(/\/$/, '')
const EMAIL = process.env.ADMIN_JOURNEY_EMAIL ?? ''
const PASSWORD = process.env.ADMIN_JOURNEY_PASSWORD ?? ''
const OTP = process.env.ADMIN_JOURNEY_OTP ?? undefined

const LIVE_READY = Boolean(ADMIN_URL && PUBLIC_URL && EMAIL && PASSWORD)

test.describe('PU-25 live publication journey @live @staging', () => {
  test.skip(
    !LIVE_READY,
    'live journey requires ADMIN_JOURNEY_ADMIN_URL, ADMIN_JOURNEY_PUBLIC_URL, ADMIN_JOURNEY_EMAIL and ADMIN_JOURNEY_PASSWORD',
  )

  test('admin draft reaches the public article page, then archives', async ({
    request,
  }) => {
    const marker = `journey-${Date.now().toString(36)}`
    const slug = `live-${marker}`
    const admin = request

    // 1. CSRF seed + login (login itself enforces CSRF + OTP).
    const csrfSeed = await admin.get(`${ADMIN_URL}/auth/csrf`)
    expect(csrfSeed.ok(), 'csrf seed').toBeTruthy()
    const csrfToken = (await csrfSeed.json()).csrfToken as string
    expect(typeof csrfToken).toBe('string')

    const login = await admin.post(`${ADMIN_URL}/auth/login`, {
      headers: { 'X-CSRFToken': csrfToken },
      data: {
        email: EMAIL,
        password: PASSWORD,
        ...(OTP ? { otpToken: OTP } : {}),
      },
    })
    expect(login.ok(), `login: ${await login.text()}`).toBeTruthy()

    const authed = async () => {
      const res = await admin.get(`${ADMIN_URL}/auth/csrf`)
      return (await res.json()).csrfToken as string
    }

    let articleId = 0
    try {
      // 2. Create draft with a unique marker title.
      const created = await admin.post(`${ADMIN_URL}/content/article`, {
        headers: { 'X-CSRFToken': await authed() },
        data: {
          locale: 'en',
          slug,
          title: `Live journey ${marker}`,
          status: 'draft',
          fields: {},
        },
      })
      expect(created.ok(), `create: ${await created.text()}`).toBeTruthy()
      const createdBody = await created.json()
      articleId = createdBody.id as number
      expect(articleId).toBeGreaterThan(0)

      // 3. Edit behind If-Match (datetime round-trip from updatedAt).
      const updated = await admin.put(
        `${ADMIN_URL}/content/article/${articleId}`,
        {
          headers: {
            'X-CSRFToken': await authed(),
            'If-Match': createdBody.updatedAt as string,
          },
          data: { title: `Live journey edited ${marker}` },
        },
      )
      expect(updated.ok(), `edit: ${await updated.text()}`).toBeTruthy()
      const updatedBody = await updated.json()

      // 4. Publish transition (approval gates fail loudly here).
      const transition = await admin.post(
        `${ADMIN_URL}/content/article/${articleId}/transition`,
        {
          headers: {
            'X-CSRFToken': await authed(),
            'If-Match': updatedBody.updatedAt as string,
          },
          data: { to: 'published', reason: 'PU-25 live journey probe' },
        },
      )
      expect(
        transition.ok(),
        `publish transition: ${await transition.text()}`,
      ).toBeTruthy()

      // 5. Poll the public page until the marker renders (static rebuild).
      const publicUrl = `${PUBLIC_URL}/en/blog/${slug}/`
      let rendered = false
      const deadline = Date.now() + 10 * 60 * 1000
      while (Date.now() < deadline) {
        const page = await admin.get(publicUrl)
        if (page.ok() && (await page.text()).includes(marker)) {
          rendered = true
          break
        }
        await new Promise((r) => setTimeout(r, 15_000))
      }
      expect(
        rendered,
        `marker ${marker} never rendered at ${publicUrl} (staging rebuild pending?)`,
      ).toBe(true)
    } finally {
      // 6. Cleanup: archive so the probe never stays public.
      if (articleId > 0) {
        const detail = await admin.get(
          `${ADMIN_URL}/content/article/${articleId}`,
        )
        if (detail.ok()) {
          const body = await detail.json()
          if (body.status === 'published') {
            await admin.post(
              `${ADMIN_URL}/content/article/${articleId}/transition`,
              {
                headers: {
                  'X-CSRFToken': await authed(),
                  'If-Match': body.updatedAt as string,
                },
                data: { to: 'archived', reason: 'PU-25 probe cleanup' },
              },
            )
          }
        }
      }
    }
  })
})
