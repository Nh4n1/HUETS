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

const voucherDateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function formatVoucherDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  const parts = Object.fromEntries(
    voucherDateTimeFormatter.formatToParts(date).map(({ type, value: partValue }) => [type, partValue]),
  )
  return `${parts.hour}:${parts.minute} · ${parts.day}/${parts.month}/${parts.year}`
}

export function getVoucherConditionSummary(benefit) {
  if (benefit?.minOrderAmount > 0) return `Đơn từ ${formatMoney(benefit.minOrderAmount)}`
  if (benefit?.maxDiscountAmount > 0) return `Tối đa ${formatMoney(benefit.maxDiscountAmount)}`
  return ''
}

export function getViewerClaimPresentation(viewerClaim) {
  if (!viewerClaim) return null
  const states = {
    available: { label: 'Đã lưu', action: 'Xem Voucher đã lưu', tone: 'saved' },
    used: { label: 'Đã sử dụng', action: 'Xem Voucher', tone: 'neutral' },
    expired: { label: 'Đã hết hạn', action: 'Xem Voucher', tone: 'warning' },
    unavailable: { label: 'Không khả dụng', action: 'Xem Voucher', tone: 'warning' },
  }
  return states[viewerClaim.displayStatus] ?? states.unavailable
}

export function getClaimTab(status) {
  if (status === 'available') return 'available'
  if (status === 'used') return 'used'
  return 'unavailable'
}
