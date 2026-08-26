export const VOUCHER_STATUS = {
  draft: { label: 'Bản nháp', color: 'default' },
  active: { label: 'Đang chạy', color: 'success' },
  paused: { label: 'Tạm dừng', color: 'warning' },
  ended: { label: 'Đã kết thúc', color: 'default' },
}

export const CLAIM_STATUS = {
  available: { label: 'Có thể sử dụng', color: 'success' },
  used: { label: 'Đã sử dụng', color: 'default' },
  expired: { label: 'Đã hết hạn', color: 'warning' },
  unavailable: { label: 'Tạm không khả dụng', color: 'error' },
}

export function formatMoney(value) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)
}

export function formatVoucherBenefit(benefit) {
  if (!benefit) return ''
  const base = benefit.type === 'percentage' ? `Giảm ${benefit.value}%` : `Giảm ${formatMoney(benefit.value)}`
  return benefit.maxDiscountAmount ? `${base}, tối đa ${formatMoney(benefit.maxDiscountAmount)}` : base
}

export function getClaimTab(status) {
  if (status === 'available') return 'available'
  if (status === 'used') return 'used'
  return 'unavailable'
}
