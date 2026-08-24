import { httpClient } from '../../../shared/api/httpClient'

export async function getAdminCategoriesApi(params) {
  const response = await httpClient.get('/admin/reference/categories', { params })
  return response.data
}

export async function getAdminCategoryApi(code) {
  const response = await httpClient.get(`/admin/reference/categories/${code}`)
  return response.data
}

export async function createAdminCategoryApi(payload) {
  const response = await httpClient.post('/admin/reference/categories', payload)
  return response.data
}

export async function updateAdminCategoryApi(code, payload) {
  const response = await httpClient.patch(`/admin/reference/categories/${code}`, payload)
  return response.data
}

export async function updateCategoryTagRulesApi(code, payload) {
  const response = await httpClient.put(`/admin/reference/categories/${code}/tag-rules`, payload)
  return response.data
}

export async function getAdminTagGroupsApi() {
  const response = await httpClient.get('/admin/reference/tag-groups')
  return response.data
}

export async function createAdminTagGroupApi(payload) {
  const response = await httpClient.post('/admin/reference/tag-groups', payload)
  return response.data
}

export async function updateAdminTagGroupApi(code, payload) {
  const response = await httpClient.patch(`/admin/reference/tag-groups/${code}`, payload)
  return response.data
}

export async function createAdminTagApi(groupCode, payload) {
  const response = await httpClient.post(`/admin/reference/tag-groups/${groupCode}/tags`, payload)
  return response.data
}

export async function updateAdminTagApi(groupCode, tagCode, payload) {
  const response = await httpClient.patch(`/admin/reference/tag-groups/${groupCode}/tags/${tagCode}`, payload)
  return response.data
}
