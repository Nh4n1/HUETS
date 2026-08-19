import { httpClient } from '../../../shared/api/httpClient'

// POST /locations tự động duyệt ngay nếu người gọi là admin, còn lại sẽ vào
// hàng chờ kiểm duyệt (status: pending) - xử lý ở BE, FE không cần phân biệt.
export async function createLocationApi(payload) {
  const response = await httpClient.post('/locations', payload)
  return response.data
}