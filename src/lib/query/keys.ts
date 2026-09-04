export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  dashboard: {
    summary: ['dashboard', 'summary'] as const,
    contentHealth: ['dashboard', 'content-health'] as const,
  },
  content: {
    list: (entity: string, params?: Record<string, string>) =>
      ['content', entity, 'list', params ?? {}] as const,
    detail: (entity: string, id: number) =>
      ['content', entity, 'detail', id] as const,
  },
  media: {
    list: (params?: Record<string, string>) =>
      ['media', 'list', params ?? {}] as const,
  },
  site: {
    settings: ['site', 'settings'] as const,
  },
} as const
