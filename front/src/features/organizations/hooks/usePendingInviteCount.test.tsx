// src/features/organizations/hooks/usePendingInviteCount.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../api/organizationsApi', () => ({
  pendingInviteCountRequest: vi.fn(),
}))

import { usePendingInviteCount } from './usePendingInviteCount'
import { pendingInviteCountRequest } from '../api/organizationsApi'

const mockReq = vi.mocked(pendingInviteCountRequest)

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('usePendingInviteCount', () => {
  it('retorna a contagem de convites pendentes', async () => {
    mockReq.mockResolvedValue({ count: 4 })
    const { result } = renderHook(() => usePendingInviteCount(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ count: 4 })
  })
})
