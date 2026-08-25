import { beforeEach, describe, expect, it, vi } from 'vitest'
import { httpClient } from '../../../shared/api/httpClient'
import {
  getMyNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from './notificationApi'

vi.mock('../../../shared/api/httpClient', () => ({
  httpClient: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}))

describe('notification API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads current-user notifications', async () => {
    const payload = { data: [], unreadCount: 0 }
    httpClient.get.mockResolvedValue({ data: payload })

    await expect(getMyNotificationsApi()).resolves.toBe(payload)
    expect(httpClient.get).toHaveBeenCalledWith('/me/notifications')
  })

  it('marks one and all notifications read', async () => {
    httpClient.patch
      .mockResolvedValueOnce({ data: { id: 'notification-1', isRead: true } })
      .mockResolvedValueOnce({ data: { updatedCount: 2 } })

    await markNotificationReadApi('notification-1')
    await markAllNotificationsReadApi()

    expect(httpClient.patch).toHaveBeenNthCalledWith(
      1,
      '/me/notifications/notification-1/read',
    )
    expect(httpClient.patch).toHaveBeenNthCalledWith(2, '/me/notifications/read-all')
  })
})
