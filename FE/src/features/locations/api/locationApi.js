import { httpClient } from '../../../shared/api/httpClient'

export async function getPublicLocationsApi(params = {}) {
  const response = await httpClient.get('/locations', { params })
  return response.data
}
