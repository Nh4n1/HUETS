import { httpClient } from '../../../shared/api/httpClient'

export async function getLocationsApi(query = {}) {
  const response = await httpClient.get('/locations', { params: query })
  return response.data
}

export async function getAdminLocationsApi(query = {}) {
  const response = await httpClient.get('/admin/locations/moderation', { params: query })
  return response.data
}

export async function getAdminLocationByIdApi(locationId) {
  const response = await httpClient.get(`/admin/locations/${locationId}`)
  return response.data
}

export async function approveLocationApi(locationId, payload) {
  const response = await httpClient.post(`/admin/locations/${locationId}/approve`, payload)
  return response.data
}

export async function rejectLocationApi(locationId, payload) {
  const response = await httpClient.post(`/admin/locations/${locationId}/reject`, payload)
  return response.data
}

export async function updateAdminLocationApi(locationId, payload) {
  const response = await httpClient.patch(`/admin/locations/${locationId}`, payload)
  return response.data
}

export async function deleteAdminLocationApi(locationId, payload) {
  const response = await httpClient.delete(`/admin/locations/${locationId}`, { data: payload })
  return response.data
}
