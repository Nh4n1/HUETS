import { httpClient } from '../../../shared/api/httpClient'

export async function getCategoriesApi() {
  const response = await httpClient.get('/reference/categories')
  return response.data
}

export async function getTagsByCategoryApi(categoryCode) {
  const response = await httpClient.get(`/reference/categories/${categoryCode}/tags`)
  return response.data
}

export async function getWardsApi() {
  const response = await httpClient.get('/reference/wards')
  return response.data
}
