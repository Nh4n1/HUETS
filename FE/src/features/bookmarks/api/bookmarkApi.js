import { httpClient } from '../../../shared/api/httpClient'

// BE: POST /api/bookmarks  body { targetType, targetId }
// -> 201 { id, userId, targetType, targetId, createdAt }
export async function createBookmarkApi({ targetType, targetId }) {
  const response = await httpClient.post('/bookmarks', {
    targetType,
    targetId,
  })

  return response.data
}

// BE: DELETE /api/bookmarks/:targetType/:targetId -> 204 (no body)
export async function deleteBookmarkApi({ targetType, targetId }) {
  await httpClient.delete(`/bookmarks/${targetType}/${targetId}`)
}

// BE: GET /api/me/bookmarks -> { location: [...], itinerary: [...] }
export async function getMyBookmarksApi() {
  const response = await httpClient.get('/me/bookmarks')
  const data = response.data ?? {}

  return {
    location: Array.isArray(data.location) ? data.location : [],
    itinerary: Array.isArray(data.itinerary) ? data.itinerary : [],
  }
}