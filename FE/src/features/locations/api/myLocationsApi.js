import { httpClient } from '../../../shared/api/httpClient'

export async function getMyLocationsApi(params = {}) {
  const response = await httpClient.get('/me/locations', { params })
  return response.data
}