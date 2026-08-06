export const LOCATION_STATUS = {
  pending: { label: 'Chờ kiểm duyệt', color: 'gold' },
  approved: { label: 'Đã duyệt', color: 'green' },
  rejected: { label: 'Đã từ chối', color: 'red' },
  withdrawn: { label: 'Đã rút', color: 'default' },
  hidden: { label: 'Đã ẩn', color: 'volcano' },
}

export function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}
