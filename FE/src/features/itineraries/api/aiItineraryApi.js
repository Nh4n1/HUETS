import { httpClient } from '../../../shared/api/httpClient'

export async function createAiItineraryPlanApi(payload) {
  const response = await httpClient.post('/ai-itinerary-plans', payload)
  return response.data
}

export async function getAiItineraryPlanApi(planId) {
  const response = await httpClient.get(`/ai-itinerary-plans/${planId}`)
  return response.data
}

export async function updateAiItineraryPlanApi(planId, payload) {
  const response = await httpClient.patch(`/ai-itinerary-plans/${planId}`, payload)
  return response.data
}

export async function saveAiItineraryPlanApi(payload) {
  const response = await httpClient.post('/itineraries/from-plan', payload)
  return response.data
}
