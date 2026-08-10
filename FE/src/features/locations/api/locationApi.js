import { httpClient } from '../../../shared/api/httpClient'

export async function getPublicLocationsApi(params = {}) {
  const response = await httpClient.get('/locations', { params })
  return response.data
}

export async function searchPublicLocationsApi(params = {}) {
  // Public list accepts the same basic search filters. Using the canonical
  // collection endpoint also keeps the page compatible with a backend
  // process started before the optional /locations/search alias was added.
  const response = await httpClient.get('/locations', { params })
  return response.data
}

export async function getPublicLocationByIdApi(locationId) {
  const response = await httpClient.get(`/locations/${locationId}`)
  return response.data
}
