import { httpClient } from '../../../shared/api/httpClient'

export async function createLocationApi(payload) {
  const response = await httpClient.post('/locations', payload)
  return response.data
}

export async function getLocationsApi(query = {}) {
  const response = await httpClient.get('/locations', { params: query })
  return response.data
}
