import { httpClient } from '../../../shared/api/httpClient'

export async function getAdminDashboardApi() {
  const response = await httpClient.get('/admin/dashboard')
  return response.data
}
