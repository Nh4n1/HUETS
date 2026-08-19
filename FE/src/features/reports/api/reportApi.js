import { httpClient } from '../../../shared/api/httpClient'

// BE: POST /api/reports  body { targetType, targetId, reasonCode, detail }
// -> 201 { id, reporterId, targetType, targetId, reasonCode, detail, status, createdAt }
export async function createReportApi({ targetType, targetId, reasonCode, detail }) {
  const response = await httpClient.post('/reports', {
    targetType,
    targetId,
    reasonCode,
    detail,
  })

  return response.data
}