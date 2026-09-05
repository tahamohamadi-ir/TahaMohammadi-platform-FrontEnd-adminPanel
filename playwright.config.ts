import { defineConfig } from '@playwright/test'

const PORT = 5173

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    browserName: 'chromium',
    // Network policy blocks the Playwright CDN here; use the system
    // Edge/Chrome channel. CI installs browsers via `playwright install`.
    channel: process.env.CI ? undefined : 'msedge',
  },
  webServer: {
    command: 'npm run dev',
    url: `http://127.0.0.1:${PORT}/admin/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
