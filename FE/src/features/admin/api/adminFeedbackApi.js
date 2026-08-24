import { httpClient } from '../../../shared/api/httpClient'

export async function getAdminFeedbackApi(params) {
  const response = await httpClient.get('/admin/feedback', { params })
  return response.data
}

export async function getAdminFeedbackDetailApi(id) {
  const response = await httpClient.get(`/admin/feedback/${id}`)
  return response.data
}

export async function updateAdminFeedbackApi(id, payload) {
  const response = await httpClient.patch(`/admin/feedback/${id}`, payload)
  return response.data
}
