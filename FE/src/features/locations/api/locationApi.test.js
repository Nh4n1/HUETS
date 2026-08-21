import { beforeEach, describe, expect, it, vi } from 'vitest'
import { httpClient } from '../../../shared/api/httpClient'
import {
  clearLocationReviewsCache,
  deleteMyLocationReviewApi,
  getLocationReviewsApi,
  saveLocationReviewApi,
} from './locationApi'

vi.mock('../../../shared/api/httpClient', () => ({
  httpClient: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const reviewResponse = (id) => ({
  data: {
    data: [{ id }],
    meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
  },
})

describe('location review API cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearLocationReviewsCache('location-1')
  })

  it('reuses the cached page for the same location and filters', async () => {
    httpClient.get.mockResolvedValue(reviewResponse('review-1'))
    const params = { page: 1, pageSize: 10, rating: 5, sortBy: 'newest' }

    const first = await getLocationReviewsApi('location-1', params)
    const second = await getLocationReviewsApi('location-1', params)

    expect(httpClient.get).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
  })

  it('keeps separate cache entries for different rating filters', async () => {
    httpClient.get
      .mockResolvedValueOnce(reviewResponse('five-star-review'))
      .mockResolvedValueOnce(reviewResponse('four-star-review'))

    await getLocationReviewsApi('location-1', { rating: 5 })
    await getLocationReviewsApi('location-1', { rating: 4 })

    expect(httpClient.get).toHaveBeenCalledTimes(2)
  })

  it('can bypass the cache for a manual refresh', async () => {
    httpClient.get
      .mockResolvedValueOnce(reviewResponse('old-review'))
      .mockResolvedValueOnce(reviewResponse('new-review'))

    await getLocationReviewsApi('location-1', { rating: 5 })
    const refreshed = await getLocationReviewsApi(
      'location-1',
      { rating: 5 },
      { forceRefresh: true },
    )

    expect(httpClient.get).toHaveBeenCalledTimes(2)
    expect(refreshed.data[0].id).toBe('new-review')
  })

  it('requests fresh data after the 30-second TTL expires', async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-08-21T10:00:00.000Z'))
      httpClient.get
        .mockResolvedValueOnce(reviewResponse('cached-review'))
        .mockResolvedValueOnce(reviewResponse('fresh-review'))

      await getLocationReviewsApi('location-1', { rating: 5 })
      vi.advanceTimersByTime(30_001)
      const result = await getLocationReviewsApi('location-1', { rating: 5 })

      expect(httpClient.get).toHaveBeenCalledTimes(2)
      expect(result.data[0].id).toBe('fresh-review')
    } finally {
      vi.useRealTimers()
    }
  })

  it.each([
    ['save', () => saveLocationReviewApi('location-1', { rating: 5 })],
    ['delete', () => deleteMyLocationReviewApi('location-1')],
  ])('invalidates every cached filter after %s', async (_, mutate) => {
    httpClient.get
      .mockResolvedValueOnce(reviewResponse('before-mutation'))
      .mockResolvedValueOnce(reviewResponse('after-mutation'))
    httpClient.put.mockResolvedValue({ data: {} })
    httpClient.delete.mockResolvedValue({ data: {} })

    await getLocationReviewsApi('location-1', { rating: 5 })
    await mutate()
    const result = await getLocationReviewsApi('location-1', { rating: 5 })

    expect(httpClient.get).toHaveBeenCalledTimes(2)
    expect(result.data[0].id).toBe('after-mutation')
  })
})
