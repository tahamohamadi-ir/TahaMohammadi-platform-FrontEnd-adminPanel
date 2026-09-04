import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { createTestQueryClient } from '@/lib/query/client'
import { queryKeys } from '@/lib/query/keys'
import { useDashboardSummary } from '@/lib/api/hooks/useDashboard'

function wrapper(client = createTestQueryClient()) {
  return function QueryWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('TanStack Query integration', () => {
  it('fetches dashboard summary through useQuery', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            drafts: 3,
            published: 10,
            contentCounts: { article: 5 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    const { result } = renderHook(() => useDashboardSummary(), {
      wrapper: wrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.drafts).toBe(3)
    expect(queryKeys.dashboard.summary).toEqual(['dashboard', 'summary'])
  })
})
