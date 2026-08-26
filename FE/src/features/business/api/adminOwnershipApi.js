import { httpClient } from '../../../shared/api/httpClient'

export async function getAdminOwnershipsApi(params = {}) {
  const response = await httpClient.get('/admin/location-ownerships', { params })
  return response.data
}

export async function getAdminOwnershipApi(ownershipId) {
  const response = await httpClient.get(`/admin/location-ownerships/${ownershipId}`)
  return response.data
}

export async function approveOwnershipApi(ownershipId) {
  const response = await httpClient.post(`/admin/location-ownerships/${ownershipId}/approve`)
  return response.data
}

export async function rejectOwnershipApi(ownershipId, payload) {
  const response = await httpClient.post(`/admin/location-ownerships/${ownershipId}/reject`, payload)
  return response.data
}

export async function revokeOwnershipApi(ownershipId, payload) {
  const response = await httpClient.post(`/admin/location-ownerships/${ownershipId}/revoke`, payload)
  return response.data
}
