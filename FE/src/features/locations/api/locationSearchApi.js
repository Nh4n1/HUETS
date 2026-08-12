import { httpClient } from '../../../shared/api/httpClient'

export async function searchLocationsApi(payload) {
  const response = await httpClient.post('/location-search', payload)
  return response.data
}

export async function executeLocationSearchApi(payload) {
  const response = await httpClient.post('/location-search/execute', payload)
  return response.data
}
