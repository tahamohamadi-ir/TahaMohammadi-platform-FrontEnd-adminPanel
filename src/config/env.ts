export const adminBasePath = '/admin'

export function adminPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${adminBasePath}${normalized}`
}

export function apiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE?.trim() ?? ''
  return configured.replace(/\/$/, '')
}

export function adminApiPath(suffix = ''): string {
  const base = apiBaseUrl()
  const path = `/api/v1/admin${suffix.startsWith('/') ? suffix : suffix ? `/${suffix}` : ''}`
  return base ? `${base}${path}` : path
}
