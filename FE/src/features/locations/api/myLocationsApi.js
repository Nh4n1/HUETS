import { httpClient } from '../../../shared/api/httpClient'

export async function getMyLocationsApi(params = {}) {
  const response = await httpClient.get('/me/locations', { params })
  return response.data
}

export async function getMyLocationApi(locationId) {
  const response = await httpClient.get(`/me/locations/${locationId}`)
  return response.data
}

export async function updateMyLocationApi(locationId, payload) {
  const response = await httpClient.patch(`/me/locations/${locationId}`, payload)
  return response.data
}

export async function resubmitMyLocationApi(locationId, payload) {
  const response = await httpClient.post(`/me/locations/${locationId}/resubmit`, payload)
  return response.data
}

export async function withdrawMyLocationApi(locationId, payload) {
  const response = await httpClient.post(`/me/locations/${locationId}/withdraw`, payload)
  return response.data
}
