import { describe, expect, it } from 'vitest'
import {
  getReportErrorFeedback,
  getReportTargetLink,
  normalizeReportPayload,
  validateReportDetail,
} from './reportDomain'

describe('report domain', () => {
  it('chuẩn hóa payload và trim phần mô tả', () => {
    expect(normalizeReportPayload({
      targetType: 'location',
      targetId: 'location-id',
      reasonCode: 'incorrect_info',
      detail: '  Sai giờ mở cửa.  ',
    })).toEqual({
      targetType: 'location',
      targetId: 'location-id',
      reasonCode: 'incorrect_info',
      detail: 'Sai giờ mở cửa.',
    })
  })

  it('yêu cầu mô tả đủ rõ khi chọn lý do khác', () => {
    expect(validateReportDetail('other', '  quá ngắn  ')).toContain('ít nhất 10')
    expect(validateReportDetail('other', '  Nội dung cần xem lại.  ')).toBeNull()
    expect(validateReportDetail('spam', '')).toBeNull()
  })

  it('không chấp nhận mô tả quá 500 ký tự', () => {
    expect(validateReportDetail('spam', 'a'.repeat(501))).toContain('500')
  })

  it('nhận diện duplicate bằng error code thay vì mọi response 409', () => {
    expect(getReportErrorFeedback({
      response: { status: 409, data: { code: 'REPORT_ALREADY_EXISTS', message: 'Đang xử lý.' } },
    })).toEqual(expect.objectContaining({ type: 'info', closeModal: true, markSubmitted: true }))

    expect(getReportErrorFeedback({
      response: { status: 409, data: { code: 'CONFLICT', message: 'Xung đột.' } },
    })).toEqual(expect.objectContaining({ type: 'error', closeModal: false, markSubmitted: false }))
  })

  it('phân biệt target không còn tồn tại, rate limit và lỗi mạng', () => {
    expect(getReportErrorFeedback({ response: { status: 404, data: {} } })).toEqual(
      expect.objectContaining({ type: 'warning', closeModal: true, disableTarget: true }),
    )
    expect(getReportErrorFeedback({ response: { status: 429, data: {} } })).toEqual(
      expect.objectContaining({ type: 'warning', closeModal: false }),
    )
    expect(getReportErrorFeedback(new Error('Network Error'))).toEqual(
      expect.objectContaining({ type: 'error', closeModal: false }),
    )
  })

  it('đóng modal khi backend phát hiện người dùng tự báo cáo nội dung', () => {
    expect(getReportErrorFeedback({
      response: { status: 403, data: { code: 'CANNOT_REPORT_OWN_CONTENT' } },
    })).toEqual(expect.objectContaining({
      type: 'warning',
      closeModal: true,
      markSubmitted: false,
      disableTarget: true,
    }))
  })

  it('chỉ tạo public link cho target có trang chi tiết phù hợp', () => {
    expect(getReportTargetLink({ targetType: 'location', targetId: '1' })).toBe('/locations/1')
    expect(getReportTargetLink({ targetType: 'itinerary', targetId: '2' })).toBe('/itineraries/2')
    expect(getReportTargetLink({
      targetType: 'locationReview',
      targetId: '3',
      targetSnapshot: { contextId: 'location-3' },
    })).toBe('/locations/location-3')
    expect(getReportTargetLink({ targetType: 'locationReview', targetId: '3' })).toBeNull()
  })

  it('keeps report evidence tokens in the normalized payload', () => {
    expect(normalizeReportPayload({
      targetType: 'location',
      targetId: 'location-id',
      reasonCode: 'spam',
      imageAssetTokens: ['token-1'],
    })).toMatchObject({ imageAssetTokens: ['token-1'] })
  })
})
