import { httpClient } from '../../../shared/api/httpClient'

export async function getAdminItinerariesApi(query = {}) {
  const response = await httpClient.get('/admin/itineraries', { params: query })
  return response.data
}

export async function getAdminItineraryApi(itineraryId) {
  const response = await httpClient.get(`/admin/itineraries/${itineraryId}`)
  return response.data
}

export async function moderateItineraryApi(itineraryId, payload) {
  const response = await httpClient.patch(`/admin/itineraries/${itineraryId}`, payload)
  return response.data
}
