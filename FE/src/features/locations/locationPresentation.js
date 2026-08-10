const tagLabels = {
  quiet: 'Yên tĩnh',
  lively: 'Sôi động',
  cozy: 'Ấm cúng',
  romantic: 'Lãng mạn',
  traditional_ambience: 'Không gian truyền thống',
  indoor: 'Trong nhà',
  outdoor: 'Ngoài trời',
  garden_space: 'Không gian sân vườn',
  riverside: 'Ven sông',
  scenic_view: 'Có cảnh đẹp',
  family: 'Gia đình',
  children: 'Trẻ em',
  couples: 'Cặp đôi',
  groups: 'Nhóm bạn',
  solo_travelers: 'Khách đi một mình',
  parking: 'Có chỗ đỗ xe',
  wifi: 'Có Wi-Fi',
  air_conditioning: 'Có điều hòa',
  wheelchair_accessible: 'Hỗ trợ xe lăn',
  restroom: 'Có nhà vệ sinh',
  pet_friendly: 'Cho phép thú cưng',
  sightseeing: 'Tham quan',
  photography: 'Chụp ảnh',
  cultural_experience: 'Trải nghiệm văn hóa',
  outdoor_activity: 'Hoạt động ngoài trời',
  nightlife: 'Hoạt động về đêm',
  local_food: 'Ẩm thực địa phương',
  vegetarian_options: 'Có món chay',
  takeaway: 'Có mang đi',
  reservation_available: 'Có đặt chỗ',
  breakfast_included: 'Bao gồm bữa sáng',
  swimming_pool: 'Có hồ bơi',
  airport_shuttle: 'Đưa đón sân bay',
  twenty_four_hour_reception: 'Lễ tân 24 giờ',
  free_entry: 'Miễn phí',
  budget: 'Tiết kiệm',
  mid_range: 'Tầm trung',
  premium: 'Cao cấp',
}

const dayLabels = {
  1: 'Thứ Hai',
  2: 'Thứ Ba',
  3: 'Thứ Tư',
  4: 'Thứ Năm',
  5: 'Thứ Sáu',
  6: 'Thứ Bảy',
  7: 'Chủ Nhật',
}

export function getTagLabel(code) {
  return tagLabels[code] ?? code.replaceAll('_', ' ')
}

export function getOpeningHoursRows(openingHours) {
  if (!openingHours || openingHours.status === 'unknown') return []
  if (openingHours.status === 'always_open') {
    return [{ dayLabel: 'Mỗi ngày', hours: 'Mở cửa 24 giờ' }]
  }

  return [...(openingHours.periods ?? [])]
    .sort((left, right) => left.dayOfWeek - right.dayOfWeek)
    .map((period) => ({
      dayLabel: dayLabels[period.dayOfWeek] ?? `Ngày ${period.dayOfWeek}`,
      hours: period.ranges.map((range) => `${range.open}–${range.close}`).join(', '),
    }))
}

export function getRatingLabel(location) {
  return location.reviewCount > 0
    ? `${Number(location.averageRating).toFixed(1)} (${location.reviewCount})`
    : 'Chưa có đánh giá'
}
