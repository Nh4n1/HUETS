import { httpClient } from './httpClient'

function unwrapData(payload) {
  return payload?.data ?? payload
}

export async function getCategoriesApi() {
  const response = await httpClient.get(
    '/reference/categories',
  )

  const data = unwrapData(response.data)

  return Array.isArray(data)
    ? data
    : []
}

export async function getTagsByCategoryApi(
  categoryCode,
) {
  const response = await httpClient.get(
    `/reference/categories/${categoryCode}/tags`,
  )

  return unwrapData(response.data)
}

export async function getWardsApi() {
  const response = await httpClient.get(
    '/reference/wards',
  )

  const data = unwrapData(response.data)

  return Array.isArray(data)
    ? data
    : []
}