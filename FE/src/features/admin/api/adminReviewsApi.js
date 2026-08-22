import { httpClient } from '../../../shared/api/httpClient'

export async function getAdminReviewsApi(query = {}) {
  const response = await httpClient.get('/admin/reviews', { params: query })
  return response.data
}

export async function setAdminReviewStatusApi(reviewId, payload) {
  const response = await httpClient.patch(`/admin/reviews/${reviewId}/status`, payload)
  return response.data
}
