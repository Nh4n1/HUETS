import { httpClient } from '../../../shared/api/httpClient'

export async function createFeedbackApi(payload) {
  const response = await httpClient.post('/feedback', payload)
  return response.data
}

export async function getFeedbackUploadSignatureApi() {
  const response = await httpClient.get('/uploads/feedback-images/signature')
  return response.data
}

export async function confirmFeedbackUploadsApi(results) {
  const response = await httpClient.post('/uploads/feedback-images', { results })
  return response.data
}
