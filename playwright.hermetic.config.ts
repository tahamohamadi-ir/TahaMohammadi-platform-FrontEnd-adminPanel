import { defineConfig } from '@playwright/test'

/**
 * Hermetic full-stack acceptance config (PU-25).
 *
 * Unlike `playwright.config.ts` (Vite dev server + mocked network), this boots
 * the REAL Django backend on a disposable SQLite database and serves the REAL
 * `dist/` build at `/admin/` through Django's own `serve_admin_ui`. Nothing is
 * mocked and no owner credential is needed.
 *
 * Ports and the hermetic root are ephemeral and created by
 * `tests/hermetic/run-hermetic.mjs`, which exports them through the
 * environment so a failed run never collides with a live dev server.
 */
const PORT = Number(process.env.HERMETIC_PORT ?? 8971)

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/hermetic-journey.e2e.ts',
  timeout: 120_000,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    browserName: 'chromium',
    // The network policy blocks the Playwright CDN here; use the system
    // Edge/Chrome channel, matching the default config.
    channel: process.env.CI ? undefined : 'msedge',
  },
})
