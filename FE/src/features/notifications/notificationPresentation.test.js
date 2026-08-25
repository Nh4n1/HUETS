import { describe, expect, it } from 'vitest'
import {
  markNotificationReadLocally,
  resolveNotificationTarget,
} from './notificationPresentation'

describe('notification presentation', () => {
  it.each(['LOCATION_APPROVED', 'LOCATION_RESTORED'])(
    'routes %s to public location details',
    (type) => {
      expect(resolveNotificationTarget({ type, locationId: 'location-1' }))
        .toBe('/locations/location-1')
    },
  )

  it.each(['LOCATION_REJECTED', 'LOCATION_HIDDEN'])(
    'routes %s to user contributions',
    (type) => {
      expect(resolveNotificationTarget({ type, locationId: 'location-1' }))
        .toBe('/locations/mine')
    },
  )

  it('optimistically marks one unread item and decrements the badge', () => {
    const result = markNotificationReadLocally([
      { id: 'notification-1', isRead: false },
      { id: 'notification-2', isRead: false },
    ], 2, 'notification-1')

    expect(result.notifications).toEqual([
      { id: 'notification-1', isRead: true },
      { id: 'notification-2', isRead: false },
    ])
    expect(result.unreadCount).toBe(1)
  })

  it('does not decrement again when an item is already read', () => {
    const notifications = [{ id: 'notification-1', isRead: true }]
    expect(markNotificationReadLocally(notifications, 0, 'notification-1'))
      .toEqual({ notifications, unreadCount: 0 })
  })
})
