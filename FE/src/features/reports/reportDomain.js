export const REPORT_DETAIL_MAX_LENGTH = 500
export const REPORT_OTHER_DETAIL_MIN_LENGTH = 10

export const REPORT_TARGETS = {
  location: {
    label: 'Địa điểm',
    title: 'Báo cáo địa điểm',
  },
  locationReview: {
    label: 'Đánh giá',
    title: 'Báo cáo đánh giá',
  },
  itinerary: {
    label: 'Lịch trình',
    title: 'Báo cáo lịch trình',
  },
}

export const REPORT_REASONS = {
  spam: 'Spam / quảng cáo',
  inappropriate: 'Nội dung không phù hợp',
  incorrect_info: 'Thông tin sai lệch',
  offensive: 'Ngôn từ xúc phạm, gây khó chịu',
  other: 'Lý do khác',
}

export const REPORT_STATUSES = {
  pending: { label: 'Chờ xử lý', color: 'gold' },
  resolved: { label: 'Đã xử lý', color: 'green' },
  dismissed: { label: 'Đã bỏ qua', color: 'default' },
}

export const REPORT_REASON_OPTIONS = Object.entries(REPORT_REASONS).map(([value, label]) => ({
  value,
  label,
}))

export function normalizeReportPayload({ targetType, targetId, reasonCode, detail }) {
  return {
    targetType,
    targetId,
    reasonCode,
    detail: typeof detail === 'string' ? detail.trim() : '',
  }
}

export function validateReportDetail(reasonCode, detail) {
  if (detail !== undefined && detail !== null && typeof detail !== 'string') {
    return 'Mô tả bổ sung không hợp lệ.'
  }

  const normalizedDetail = typeof detail === 'string' ? detail.trim() : ''

  if (normalizedDetail.length > REPORT_DETAIL_MAX_LENGTH) {
    return `Mô tả không được vượt quá ${REPORT_DETAIL_MAX_LENGTH} ký tự.`
  }

  if (reasonCode === 'other' && normalizedDetail.length < REPORT_OTHER_DETAIL_MIN_LENGTH) {
    return `Vui lòng mô tả lý do khác ít nhất ${REPORT_OTHER_DETAIL_MIN_LENGTH} ký tự.`
  }

  return null
}

export function getReportErrorFeedback(error) {
  const status = error?.response?.status
  const code = error?.response?.data?.code
  const serverMessage = error?.response?.data?.message

  if (code === 'REPORT_ALREADY_EXISTS') {
    return {
      type: 'info',
      message: serverMessage ?? 'Bạn đã báo cáo nội dung này và báo cáo đang được xử lý.',
      closeModal: true,
      markSubmitted: true,
      disableTarget: false,
    }
  }

  if (code === 'CANNOT_REPORT_OWN_CONTENT') {
    return {
      type: 'warning',
      message: serverMessage ?? 'Bạn không thể báo cáo nội dung của chính mình.',
      closeModal: true,
      markSubmitted: false,
      disableTarget: true,
    }
  }

  if (status === 404) {
    return {
      type: 'warning',
      message: serverMessage ?? 'Nội dung này không còn tồn tại hoặc không thể báo cáo.',
      closeModal: true,
      markSubmitted: false,
      disableTarget: true,
    }
  }

  if (status === 429) {
    return {
      type: 'warning',
      message: serverMessage ?? 'Bạn đang gửi báo cáo quá nhanh. Vui lòng thử lại sau.',
      closeModal: false,
      markSubmitted: false,
      disableTarget: false,
    }
  }

  if (!error?.response) {
    return {
      type: 'error',
      message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối và thử lại.',
      closeModal: false,
      markSubmitted: false,
      disableTarget: false,
    }
  }

  return {
    type: 'error',
    message: serverMessage ?? 'Không thể gửi báo cáo. Vui lòng thử lại.',
    closeModal: false,
    markSubmitted: false,
    disableTarget: false,
  }
}

export function getReportTargetLink(report) {
  if (report?.targetType === 'location') return `/locations/${report.targetId}`
  if (report?.targetType === 'locationReview' && report.targetSnapshot?.contextId) {
    return `/locations/${report.targetSnapshot.contextId}`
  }
  if (report?.targetType === 'itinerary') return `/itineraries/${report.targetId}`
  return null
}
