import { httpClient } from '../../../shared/api/httpClient'
import { normalizeReportPayload } from '../reportDomain'

export async function createReportApi(input) {
  const response = await httpClient.post('/reports', normalizeReportPayload(input))

  return response.data
}

export async function getReportUploadSignatureApi() {
  const response = await httpClient.get('/uploads/report-images/signature')
  return response.data
}

export async function confirmReportUploadsApi(results) {
  const response = await httpClient.post('/uploads/report-images', { results })
  return response.data
}

export async function deleteReportUploadedImageApi(publicId) {
  const response = await httpClient.post('/uploads/report-images/delete', { publicId })
  return response.data
}

export async function getAdminReportsApi(query = {}) {
  const response = await httpClient.get('/admin/reports', { params: query })

  return response.data
}

export async function getAdminReportByIdApi(reportId) {
  const response = await httpClient.get(`/admin/reports/${reportId}`)

  return response.data
}

export async function updateAdminReportStatusApi(reportId, payload) {
  const response = await httpClient.patch(`/admin/reports/${reportId}/status`, payload)

  return response.data
}
