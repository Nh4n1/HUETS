export const USER_STATUS = {
  active: { label: 'Đang hoạt động', color: 'green' },
  locked: { label: 'Đã khóa', color: 'red' },
}

export const USER_ROLE = {
  user: { label: 'Người dùng', color: 'default' },
  admin: { label: 'Quản trị viên', color: 'gold' },
}

export function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}