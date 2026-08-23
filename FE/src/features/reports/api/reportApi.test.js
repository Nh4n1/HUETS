import { beforeEach, describe, expect, it, vi } from 'vitest'
import { httpClient } from '../../../shared/api/httpClient'
import {
  createReportApi,
  getAdminReportByIdApi,
  getAdminReportsApi,
  updateAdminReportStatusApi,
} from './reportApi'

vi.mock('../../../shared/api/httpClient', () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}))

describe('report api', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gửi payload report đã được trim', async () => {
    httpClient.post.mockResolvedValue({ data: { id: 'report-1' } })

    await expect(createReportApi({
      targetType: 'location',
      targetId: 'location-1',
      reasonCode: 'spam',
      detail: '  Quảng cáo lặp lại.  ',
    })).resolves.toEqual({ id: 'report-1' })

    expect(httpClient.post).toHaveBeenCalledWith('/reports', {
      targetType: 'location',
      targetId: 'location-1',
      reasonCode: 'spam',
      detail: 'Quảng cáo lặp lại.',
    })
  })

  it('truyền nguyên filter khi tải hàng chờ admin', async () => {
    httpClient.get.mockResolvedValue({ data: { data: [], meta: { total: 0 } } })
    const query = { page: 2, pageSize: 20, status: 'pending', targetType: 'itinerary' }

    await getAdminReportsApi(query)

    expect(httpClient.get).toHaveBeenCalledWith('/admin/reports', { params: query })
  })

  it('tải chi tiết và cập nhật kết luận report', async () => {
    httpClient.get.mockResolvedValue({ data: { id: 'report-1' } })
    httpClient.patch.mockResolvedValue({ data: { id: 'report-1', status: 'resolved' } })

    await expect(getAdminReportByIdApi('report-1')).resolves.toEqual({ id: 'report-1' })
    await expect(updateAdminReportStatusApi('report-1', {
      status: 'resolved',
      resolutionNote: 'Đã kiểm tra.',
      expectedUpdatedAt: '2026-08-22T10:00:00.000Z',
    })).resolves.toEqual({ id: 'report-1', status: 'resolved' })

    expect(httpClient.patch).toHaveBeenCalledWith('/admin/reports/report-1/status', {
      status: 'resolved',
      resolutionNote: 'Đã kiểm tra.',
      expectedUpdatedAt: '2026-08-22T10:00:00.000Z',
    })
  })
})
