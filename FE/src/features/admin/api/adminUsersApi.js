import { httpClient } from '../../../shared/api/httpClient'

export async function getAdminUsersApi(query = {}) {
  const response = await httpClient.get('/admin/users', { params: query })
  return response.data
}

export async function getAdminUserStatsApi() {
  const response = await httpClient.get('/admin/users/stats')
  return response.data
}

export async function createManagedUserApi(payload) {
  const response = await httpClient.post('/admin/users', payload)
  return response.data
}

export async function changeUserRoleApi(userId, role) {
  const response = await httpClient.patch(`/admin/users/${userId}/role`, { role })
  return response.data
}

export async function lockUserApi(userId, payload) {
  const response = await httpClient.post(`/admin/users/${userId}/lock`, payload)
  return response.data
}

export async function unlockUserApi(userId) {
  const response = await httpClient.post(`/admin/users/${userId}/unlock`)
  return response.data
}

export async function revokeUserSessionsApi(userId) {
  const response = await httpClient.post(`/admin/users/${userId}/revoke-sessions`)
  return response.data
}
