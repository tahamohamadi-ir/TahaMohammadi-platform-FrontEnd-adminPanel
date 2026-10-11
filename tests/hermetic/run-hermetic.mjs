#!/usr/bin/env node
/**
 * Hermetic full-stack journey runner (PU-25 acceptance evidence).
 *
 * Boots the REAL Django backend against a disposable SQLite database + media
 * root, seeds only synthetic `@example.invalid` fixtures, serves the REAL
 * built admin bundle at `/admin/`, and runs the Playwright journey against it.
 *
 * Guarantees enforced here (see also `hermetic_settings.py`):
 *   - the backend checkout is read-only; every write lands in the hermetic root
 *   - no owner credential, no staging host, no production database
 *   - the admin `dist/` is the real build output, not the Vite dev server
 *
 * Usage: `npm run test:hermetic`
 */
import { spawn } from 'node:child_process'
import {
  closeSync,
  existsSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
)
const backendRoot = process.env.HERMETIC_BACKEND_ROOT
  ? path.resolve(process.env.HERMETIC_BACKEND_ROOT)
  : 'D:/Project/tahamohammadi-platform/Back-End'
const python = path.join(backendRoot, '.venv', 'Scripts', 'python.exe')

if (!existsSync(python)) {
  fail(
    `Backend virtualenv not found at ${python}.\n` +
      'Set HERMETIC_BACKEND_ROOT to the Back-End checkout that has .venv.',
  )
}
if (!existsSync(path.join(repoRoot, 'dist', 'index.html'))) {
  fail('Admin build output missing. Run `npm run build` first.')
}

const hermeticRoot = mkdtempSync(path.join(os.tmpdir(), 'hermetic-admin-'))
const port = await findFreePort()
const env = {
  ...process.env,
  HERMETIC_ROOT: hermeticRoot,
  HERMETIC_BACKEND_ROOT: backendRoot,
  DJANGO_SETTINGS_MODULE: 'hermetic_settings',
  // `hermetic_settings` lives beside this runner, and the backend root carries
  // the real `config` package. Neither repository gains a file for this.
  PYTHONPATH: [
    path.join(repoRoot, 'tests', 'hermetic'),
    backendRoot,
    process.env.PYTHONPATH,
  ]
    .filter(Boolean)
    .join(path.delimiter),
  // Django serves the real built SPA instead of its in-image legacy path.
  ADMIN_SPA_ROOT: path.join(repoRoot, 'dist'),
  HERMETIC_PORT: String(port),
}

let server = null
try {
  console.log(`hermetic root: ${hermeticRoot}`)
  console.log(`backend:       ${backendRoot} (read-only)`)
  console.log(`admin bundle:  ${env.ADMIN_SPA_ROOT}`)

  await run(
    'migrate',
    [python, path.join(backendRoot, 'manage.py'), 'migrate', '--noinput'],
    env,
  )
  await run(
    'provision',
    [python, path.join(repoRoot, 'tests', 'hermetic', 'provision.py')],
    env,
  )

  server = spawn(
    python,
    [
      path.join(backendRoot, 'manage.py'),
      'runserver',
      `127.0.0.1:${port}`,
      '--noreload',
    ],
    { cwd: repoRoot, env, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  server.stdout.on('data', (chunk) => process.stdout.write(`[django] ${chunk}`))
  server.stderr.on('data', (chunk) => process.stderr.write(`[django] ${chunk}`))

  await waitForHealth(`http://127.0.0.1:${port}/health/`)

  // Publish one synthetic article through the real admin API so the public
  // build has something genuine to render, then build the REAL Astro site
  // against this hermetic backend and assert the marker reached the HTML.
  const marker = `HERMETIC-PUBLIC-${Date.now()}`
  const slug = `hermetic-public-${Date.now()}`
  await publishSyntheticArticle(`http://127.0.0.1:${port}`, marker, slug)

  const publicEvidence = await buildPublicSite({
    port,
    marker,
    slug,
    hermeticRoot,
  })
  console.log(publicEvidence)

  await run(
    'journey',
    [
      process.execPath,
      path.join(repoRoot, 'node_modules', '@playwright', 'test', 'cli.js'),
      'test',
      '--config',
      'playwright.hermetic.config.ts',
    ],
    env,
  )
} finally {
  if (server && !server.killed) {
    server.kill()
  }
  if (process.env.HERMETIC_KEEP === '1') {
    console.log(`hermetic artifacts kept: ${hermeticRoot}`)
  } else {
    rmSync(hermeticRoot, { recursive: true, force: true })
  }
}

function fail(message) {
  console.error(`hermetic-journey: ${message}`)
  process.exit(1)
}

function run(label, command, commandEnv, cwd = repoRoot) {
  return new Promise((resolve, reject) => {
    // No `shell`: command[0] is an absolute executable path and must not be
    // re-parsed by cmd.exe (which breaks on the "C:\Program Files\..." node
    // path and on any argument containing shell metacharacters).
    const child = spawn(command[0], command.slice(1), {
      cwd,
      env: commandEnv,
      stdio: 'inherit',
    })
    child.on('error', reject)
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${label} exited ${code}`)),
    )
  })
}

/**
 * Run a child with its own redirected stdio and no shared terminal handles.
 *
 * Used for the Astro build: sharing this runner's stdio while it also holds the
 * Django child trips a Windows libuv assertion on teardown. Redirecting to a
 * log keeps the build's process tree independent; the log is read afterwards
 * so the real build output is still reported. We deliberately do NOT use
 * `detached`, because that makes the parent stop owning the child and the
 * process can be reaped before it finishes writing.
 */
function runDetached(label, command, logFile) {
  return new Promise((resolve, reject) => {
    const out = openSync(logFile, 'w')
    const child = spawn(command[0], command.slice(1), {
      cwd: repoRoot,
      env: process.env,
      stdio: ['ignore', out, out],
      windowsHide: true,
    })
    child.on('error', (error) => {
      closeSync(out)
      reject(error)
    })
    child.on('close', (code) => {
      // 'close' (not 'exit') fires once stdio is fully flushed.
      closeSync(out)
      code === 0
        ? resolve()
        : reject(
            new Error(
              `${label} exited ${code} (see ${path.basename(logFile)})`,
            ),
          )
    })
  })
}

async function waitForHealth(url) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  fail(`backend did not become healthy at ${url}`)
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

/**
 * Drive the real admin API over HTTP: CSRF seed, TOTP login, create a draft,
 * then publish it. Uses the published RFC 6238 test key, so this is the same
 * synthetic identity the browser journey uses.
 */
async function publishSyntheticArticle(baseUrl, marker, slug) {
  const { createHmac } = await import('node:crypto')
  const key = Buffer.from('3132333435363738393031323334353637383930', 'hex')
  const counter = Math.floor(Date.now() / 1000 / 30)
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const digest = createHmac('sha1', key).update(buf).digest()
  const offset = digest[digest.length - 1] & 0xf
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3]
  const otp = String(binary % 1_000_000).padStart(6, '0')

  const jar = new Map()
  const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ')

  async function call(apiPath, init = {}) {
    const headers = new Headers(init.headers || {})
    if (jar.size) headers.set('cookie', cookieHeader())
    const response = await fetch(baseUrl + apiPath, { ...init, headers })
    for (const raw of response.headers.getSetCookie?.() ?? []) {
      const [pair] = raw.split(';')
      const at = pair.indexOf('=')
      jar.set(pair.slice(0, at), pair.slice(at + 1))
    }
    const text = await response.text()
    return { status: response.status, body: text ? JSON.parse(text) : null }
  }

  const seeded = await call('/api/v1/admin/auth/csrf')
  if (seeded.status !== 200) {
    fail(`CSRF seed failed: ${seeded.status}`)
  }
  const csrf = seeded.body.csrfToken

  const login = await call('/api/v1/admin/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrftoken': csrf },
    body: JSON.stringify({
      email: 'hermetic-journey@example.invalid',
      password: 'hermetic-journey-not-a-real-secret',
      otpToken: otp,
    }),
  })
  if (login.status !== 200) {
    fail(`admin login failed: ${login.status} ${JSON.stringify(login.body)}`)
  }

  // Login rotated the CSRF cookie; re-read the current token.
  const refreshed = (await call('/api/v1/admin/auth/csrf')).body.csrfToken

  const created = await call('/api/v1/admin/content/article', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrftoken': refreshed,
    },
    body: JSON.stringify({
      locale: 'en',
      slug,
      title: `Synthetic ${marker}`,
      status: 'draft',
      fields: {
        body: `Public build marker ${marker}.`,
        excerpt: `Synthetic excerpt ${marker}.`,
      },
    }),
  })
  if (created.status !== 201) {
    fail(
      `article create failed: ${created.status} ${JSON.stringify(created.body)}`,
    )
  }

  const published = await call(
    `/api/v1/admin/content/article/${created.body.id}/transition`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-csrftoken': refreshed,
      },
      body: JSON.stringify({ to: 'published' }),
    },
  )
  if (published.status !== 200) {
    fail(
      `publish failed: ${published.status} ${JSON.stringify(published.body)}`,
    )
  }
}

/**
 * Build the REAL public Astro site against the hermetic backend and assert the
 * published synthetic marker appears in the emitted HTML.
 *
 * `--outDir` keeps the write inside the hermetic root, so the public-site
 * repository gains no build artifact. `PUBLIC_API_BASE_URL` points the
 * build-time loaders at the hermetic backend, so `getStaticPaths` enumerates
 * and renders exactly the published rows this run created.
 */
async function buildPublicSite({ port, marker, slug, hermeticRoot }) {
  const publicSite = process.env.HERMETIC_PUBLIC_SITE
    ? path.resolve(process.env.HERMETIC_PUBLIC_SITE)
    : 'D:/Project/tahamohammadi-platform/Front-End/public-site'
  if (!existsSync(path.join(publicSite, 'node_modules'))) {
    return `[public-build] SKIPPED: ${publicSite} has no node_modules`
  }

  // The build output must live on the SAME volume as the Astro cache
  // (`.astro/`), because Astro moves prerendered assets with `rename()`
  // rather than copy. A temp dir on another drive fails with
  // `EXDEV: cross-device link not permitted`, so we place the outDir under
  // this repository's own (git-ignored) `test-results/` when the hermetic
  // root is on a different volume than the public site.
  const outDir = pickSameVolumeOutDir(hermeticRoot, publicSite)
  const keepOutDir = outDir.startsWith(repoRoot)
  if (keepOutDir) {
    rmSync(outDir, { recursive: true, force: true })
  }
  // `astro` exposes a single ESM bin; resolve it from its own package.json so
  // the path stays correct across Astro versions.
  const astroPkg = path.join(
    publicSite,
    'node_modules',
    'astro',
    'package.json',
  )
  const astroBin = path.join(
    publicSite,
    'node_modules',
    'astro',
    JSON.parse(readFileSync(astroPkg, 'utf8')).bin.astro,
  )
  // Astro's build drives a large esbuild/rollup/pagefind worker pool and tears
  // handles down aggressively. Spawned as a direct child of this long-lived
  // runner while it also holds the Django child, the inherited stdio triggers a
  // Windows libuv assertion (`UV_HANDLE_CLOSING`, exit 3221226505) *after* the
  // build has already finished. Running it detached, with its own redirected
  // log, gives it a clean process tree and a clean exit.
  const batch = path.join(hermeticRoot, 'public-build.cmd')
  const logFile = path.join(hermeticRoot, 'public-build.log')
  writeFileSync(
    batch,
    [
      '@echo off',
      `set "PUBLIC_API_BASE_URL=http://127.0.0.1:${port}"`,
      `set "PUBLIC_SITE_URL=http://127.0.0.1:${port}"`,
      `cd /d "${publicSite}"`,
      `"${process.execPath}" "${astroBin}" build --outDir "${outDir}"`,
      'exit /b %ERRORLEVEL%',
      '',
    ].join('\r\n'),
    'utf8',
  )
  await runDetached(
    'public-build',
    [process.env.ComSpec || 'cmd.exe', '/c', batch],
    logFile,
  )
  // Surface the tail of the real build log so a failure is diagnosable.
  const buildLog = existsSync(logFile) ? readFileSync(logFile, 'utf8') : ''
  const built = buildLog.match(/(\d+) page\(s\) built in ([^\n]+)/)
  console.log(
    `[public-build] astro: ${built ? `${built[1]} page(s) built in ${built[2].trim()}` : 'no page count in log'}`,
  )

  const page = path.join(outDir, 'en', 'blog', slug, 'index.html')
  if (!existsSync(page)) {
    fail(
      `public build did not emit ${page}. The published synthetic article ` +
        'did not reach the public build output.',
    )
  }
  const html = readFileSync(page, 'utf8')
  if (!html.includes(marker)) {
    fail(
      `public build emitted ${page} but it does not contain ${marker}. ` +
        'The published record did not render.',
    )
  }

  return [
    `[public-build] PASS`,
    `  site:      ${publicSite} (read-only source)`,
    `  outDir:    ${outDir}`,
    `  page:      en/blog/${slug}/index.html`,
    `  bytes:     ${html.length}`,
    `  marker:    ${marker} present in rendered HTML`,
  ].join('\n')
}
/**
 * Choose a build output directory on the same volume as the public site.
 *
 * Astro relocates prerendered assets from `.astro/` into the outDir using
 * `fs.rename`, which Windows refuses across volumes (`EXDEV`). When the
 * hermetic temp root sits on a different drive than the public site, fall back
 * to a git-ignored directory inside the admin repository instead.
 */
function pickSameVolumeOutDir(hermeticRoot, publicSite) {
  const sameVolume =
    path.parse(hermeticRoot).root.toLowerCase() ===
    path.parse(publicSite).root.toLowerCase()
  if (sameVolume) {
    return path.join(hermeticRoot, 'public-dist')
  }
  return path.join(repoRoot, 'test-results', 'hermetic-public-dist')
}
