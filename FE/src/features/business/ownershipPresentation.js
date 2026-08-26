export const OWNERSHIP_STATUS = {
  pending: { label: 'Đang xác minh', color: 'processing', description: 'HueTrip đang xem xét quyền quản lý địa điểm.' },
  verified: { label: 'Đã xác minh', color: 'success', description: 'Bạn có quyền sử dụng các tính năng Business của địa điểm.' },
  rejected: { label: 'Cần bổ sung', color: 'error', description: 'Hồ sơ cần được cập nhật theo phản hồi của Admin.' },
  revoked: { label: 'Đã thu hồi', color: 'warning', description: 'Quyền quản lý không còn hiệu lực.' },
  cancelled: { label: 'Đã hủy', color: 'default', description: 'Yêu cầu đã được người gửi hủy.' },
}

export const RELATIONSHIP_LABEL = {
  owner: 'Chủ cơ sở',
  authorized_representative: 'Người đại diện được ủy quyền',
  authorized_manager: 'Quản lý được ủy quyền',
}

export function getDerivedOwnershipState(ownership) {
  if (ownership?.location?.status === 'pending') {
    return { label: 'Đang kiểm duyệt địa điểm', color: 'processing' }
  }
  return OWNERSHIP_STATUS[ownership?.status] ?? { label: ownership?.status || 'Không rõ', color: 'default' }
}

export function getLatestReview(ownership, actions = ['rejected', 'revoked']) {
  return [...(ownership?.reviewHistory ?? [])]
    .reverse()
    .find((item) => actions.includes(item.action)) ?? null
}
