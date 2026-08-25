export function resolveNotificationTarget(notification) {
  if (
    notification.type === 'LOCATION_APPROVED'
    || notification.type === 'LOCATION_RESTORED'
  ) {
    return `/locations/${notification.locationId}`
  }
  return '/locations/mine'
}

export function markNotificationReadLocally(notifications, unreadCount, notificationId) {
  const target = notifications.find((notification) => notification.id === notificationId)
  if (!target || target.isRead) return { notifications, unreadCount }

  return {
    notifications: notifications.map((notification) => (
      notification.id === notificationId ? { ...notification, isRead: true } : notification
    )),
    unreadCount: Math.max(unreadCount - 1, 0),
  }
}
