import { httpClient } from '../../../shared/api/httpClient'

export async function getItinerariesApi() {
  const response = await httpClient.get('/me/itineraries')
  return response.data
}

export async function getItineraryApi(itineraryId) {
  const response = await httpClient.get(`/me/itineraries/${itineraryId}`)
  return response.data
}

export async function createItineraryApi(payload) {
  const response = await httpClient.post('/itineraries', payload)
  return response.data
}

export async function updateItineraryApi(itineraryId, payload) {
  const response = await httpClient.patch(`/itineraries/${itineraryId}`, payload)
  return response.data
}

export async function deleteItineraryApi(itineraryId) {
  await httpClient.delete(`/itineraries/${itineraryId}`)
}

export async function getPublicItinerariesApi(params = {}) {
  const response = await httpClient.get('/itineraries', { params })
  return response.data
}

export async function getPublicItineraryApi(itineraryId) {
  const response = await httpClient.get(`/itineraries/${itineraryId}`)
  return response.data
}

export async function copyPublicItineraryApi(itineraryId) {
  const response = await httpClient.post(`/itineraries/${itineraryId}/copy`)
  return response.data
}
