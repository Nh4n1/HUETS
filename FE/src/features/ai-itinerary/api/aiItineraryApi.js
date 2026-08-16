import { httpClient } from '../../../shared/api/httpClient'

export async function generateAIPlanApi(payload) {
  const response = await httpClient.post('/ai-itinerary-plans', payload)
  return response.data
}

export async function getAIDraftPreviewApi(planId) {
  const response = await httpClient.get(`/ai-itinerary-plans/${planId}`)
  return response.data
}

export async function getItemAlternativesApi(planId, locationId) {
  const response = await httpClient.get(`/ai-itinerary-plans/${planId}/items/${locationId}/alternatives`)
  return response.data
}

export async function replaceDraftItemApi(planId, locationId, newLocationId) {
  const response = await httpClient.patch(`/ai-itinerary-plans/${planId}/items/${locationId}/replace`, {
    newLocationId,
  })
  return response.data
}

export async function deleteDraftItemApi(planId, locationId) {
  const response = await httpClient.delete(`/ai-itinerary-plans/${planId}/items/${locationId}`)
  return response.data
}

export async function savePlanToItineraryApi(planId) {
  const response = await httpClient.post(`/ai-itinerary-plans/${planId}/save`)
  return response.data
}

export async function searchLocationsApi(query) {
  const response = await httpClient.get('/locations', { params: { q: query, limit: 8 } })
  return response.data
}

export async function getMyBookmarkedLocationsApi() {
  const response = await httpClient.get('/bookmarks', { params: { type: 'location' } })
  return response.data
}
