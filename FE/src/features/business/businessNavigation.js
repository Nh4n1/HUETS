const BUSINESS_NAVIGATION = {
  none: {
    label: 'Đăng ký địa điểm kinh doanh',
    to: '/business/register',
  },
  has_requests: {
    label: 'Trạng thái đăng ký kinh doanh',
    to: '/business/ownerships',
  },
  active_owner: {
    label: 'Quản lý doanh nghiệp',
    to: '/business',
  },
}

export function getBusinessNavigation(menuState) {
  return BUSINESS_NAVIGATION[menuState] ?? BUSINESS_NAVIGATION.none
}
