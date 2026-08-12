import {
  httpClient
} from '../../../shared/api/httpClient'

export async function getPublicLocationsApi(params = {}) {
  const response = await httpClient.get('/locations', {
    params
  })
  return response.data
}

export async function searchPublicLocationsApi(params = {}) {
  // Public list accepts the same basic search filters. Using the canonical
  // collection endpoint also keeps the page compatible with a backend
  // process started before the optional /locations/search alias was added.
  const response = await httpClient.get('/locations', {
    params
  })
  return response.data
}

export async function getPublicLocationByIdApi(locationId) {
  const response = await httpClient.get(`/locations/${locationId}`)
  return response.data
}

export async function getLocationReviewsApi(locationId, params = {}) {
  const response = await httpClient.get(`/locations/${locationId}/reviews`, {
    params
  })
  return {
    data: response.data.data,
    meta: response.data.meta
  }
}

export async function saveLocationReviewApi(locationId, data) {
  const response = await httpClient.put(`/locations/${locationId}/reviews/me`, data)
  return response.data
}