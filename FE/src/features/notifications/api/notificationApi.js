import { httpClient } from '../../../shared/api/httpClient'

export async function getMyNotificationsApi() {
  const response = await httpClient.get('/me/notifications')
  return response.data
}

export async function markNotificationReadApi(notificationId) {
  const response = await httpClient.patch(`/me/notifications/${notificationId}/read`)
  return response.data
}

export async function markAllNotificationsReadApi() {
  const response = await httpClient.patch('/me/notifications/read-all')
  return response.data
}
