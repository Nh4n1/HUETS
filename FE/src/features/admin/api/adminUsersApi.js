import { httpClient } from '../../../shared/api/httpClient'

export async function getAdminUsersApi(query = {}) {
  const response = await httpClient.get('/admin/users', { params: query })
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