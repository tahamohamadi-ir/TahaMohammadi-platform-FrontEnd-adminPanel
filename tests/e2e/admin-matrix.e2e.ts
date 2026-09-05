/**
 * ADMIN-290 browser matrix: signed out, MFA challenge, forbidden,
 * validation failure, stale revision â€” against the real UI with the admin
 * API mocked at the network boundary (same failure shapes as the accepted
 * OpenAPI contract). Server-side guard *enforcement* is proven in the
 * Back-End suite; this matrix proves the admin UI renders every failure
 * state honestly in a real browser.
 */
import { expect, test, type Page } from '@playwright/test'

interface StaffUser {
  id: number
  email: string
  displayName: string
  isStaff: boolean
  mfaEnrolled: boolean
  otpVerified: boolean
  featureFlags: Record<string, boolean>
}

const STAFF: StaffUser = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin',
  isStaff: true,
  mfaEnrolled: true,
  otpVerified: true,
  featureFlags: {},
}

interface MockResponse {
  status: number
  body: unknown
}

function json(body: unknown, status = 200): MockResponse {
  return { status, body }
}

/** Mock every admin API call at the network boundary. */
function mockApi(
  page: Page,
  handler: (url: string, method: string) => MockResponse | null,
): void {
  page.route('**/api/v1/admin/**', (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const response = handler(url.pathname + url.search, request.method())
    if (response) {
      void route.fulfill({
        status: response.status,
        contentType: 'application/json',
        body: JSON.stringify(response.body),
      })
      return
    }
    void route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'NOT_FOUND', message: 'Unhandled mock' }),
    })
  })
}

test.describe('ADMIN-290 browser matrix', () => {
  test('signed-out user is redirected to sign-in and can see the form', async ({
    page,
  }) => {
    mockApi(page, (url) => {
      if (url.endsWith('/auth/me')) return json({ code: 'AUTH_REQUIRED' }, 401)
      return null
    })
    await page.goto('/admin/dashboard')
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
  })

  test('MFA challenge appears when login requires OTP, then lands on dashboard', async ({
    page,
  }) => {
    let loginAttempts = 0
    let authed = false
    mockApi(page, (url) => {
      if (url.endsWith('/auth/csrf')) return json({ csrfToken: 'token' })
      if (url.endsWith('/auth/login')) {
        loginAttempts += 1
        if (loginAttempts === 1) {
          return json({ code: 'AUTH_FAILED', message: 'OTP required.' }, 401)
        }
        authed = true
        return json(STAFF)
      }
      // 401 until the login succeeds — otherwise the sign-in page would
      // bounce to the dashboard mid-fill (element detached).
      if (url.endsWith('/auth/me')) {
        return authed ? json(STAFF) : json({ code: 'AUTH_REQUIRED' }, 401)
      }
      if (url.endsWith('/dashboard/summary')) {
        return json({ drafts: 1, published: 2, contentCounts: {} })
      }
      if (url.endsWith('/overview/content-health')) {
        return json({
          drafts: 1,
          published: 2,
          archived: 0,
          review: 0,
          scheduled: 0,
          incompleteTranslations: 0,
          missingAltMedia: 0,
          orphanMedia: 0,
        })
      }
      return null
    })

    await page.goto('/admin/sign-in')
    await page.getByLabel('Email').fill('admin@example.com')
    await page.getByLabel('Password').fill('secret')
    await page.getByRole('button', { name: 'Sign in' }).click()
    // The MFA challenge state is proven by the OTP input appearing.
    await expect(
      page.getByLabel(/authenticator or recovery code/i),
    ).toBeVisible()

    await page.getByLabel(/authenticator or recovery code/i).fill('123456')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/admin\/dashboard$/)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('non-staff user sees the honest forbidden state', async ({ page }) => {
    mockApi(page, (url) => {
      if (url.endsWith('/auth/me')) {
        return json({ ...STAFF, isStaff: false })
      }
      return null
    })
    await page.goto('/admin/dashboard')
    await expect(page.getByRole('heading', { name: 'Forbidden' })).toBeVisible()
    await expect(page.getByText(/staff access is required/i)).toBeVisible()
  })

  test('validation failure blocks content create before any POST', async ({
    page,
  }) => {
    let createCalls = 0
    mockApi(page, (url, method) => {
      if (url.endsWith('/auth/me')) return json(STAFF)
      if (url.endsWith('/auth/csrf')) return json({ csrfToken: 'token' })
      if (url.endsWith('/content/schema')) {
        return json({
          entities: { article: { entity: 'article', fields: [] } },
        })
      }
      if (url.endsWith('/api/v1/admin/content/article') && method === 'POST') {
        createCalls += 1
        return json({
          id: 1,
          locale: 'en',
          slug: 'x',
          title: 'x',
          status: 'draft',
          fields: {},
        })
      }
      return null
    })

    await page.goto('/admin/content/article/new')
    await expect(page.getByLabel('Title')).toBeVisible()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('alert').first()).toContainText(/required/i)
    expect(createCalls).toBe(0)
  })

  test('stale revision on settings save shows the reload-latest escape', async ({
    page,
  }) => {
    mockApi(page, (url, method) => {
      if (url.endsWith('/auth/me')) return json(STAFF)
      if (url.endsWith('/auth/csrf')) return json({ csrfToken: 'token' })
      if (url.endsWith('/api/v1/admin/site')) {
        if (method === 'PUT') {
          return json(
            { code: 'STALE_REVISION', message: 'Stale settings' },
            409,
          )
        }
        return json({
          brandName: 'Taha Mohammadi',
          tagline: 'Research',
          contactEmail: 'a@example.com',
          contactEmployer: '',
          contactEmployerUrl: '',
          contactFormEnabled: true,
          contactLinkedin: '',
          contactLocation: '',
          contactOrcid: '',
          contactPhone: '',
          contactPhoneIntl: '',
          currentCv: null,
          currentCvMediaId: null,
          currentResume: null,
          currentResumeMediaId: null,
          footerText: 'Footer',
          navLinks: [],
          primaryColor: '#0f766e',
          seoDefaultDescription: 'Desc',
          seoDefaultTitle: 'Title',
          seedPolicy: null,
          updatedAt: '2026-09-01T00:00:00.000Z',
        })
      }
      return null
    })

    await page.goto('/admin/settings')
    // Wait for the form to be hydrated (getByDisplayValue is unavailable in
    // this Playwright build; the label/value pair proves the GET landed).
    await expect(page.getByLabel('Brand name')).toHaveValue('Taha Mohammadi')
    await page.getByRole('button', { name: /save settings/i }).click()
    await expect(page.getByRole('alert')).toHaveText(/changed elsewhere/i)
    await expect(
      page.getByRole('button', { name: /reload latest/i }),
    ).toBeVisible()
  })
})
