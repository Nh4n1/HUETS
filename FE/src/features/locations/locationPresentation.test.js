import { describe, expect, it } from 'vitest'
import { getOpeningHoursRows, getRatingLabel, getTagLabel } from './locationPresentation'

describe('location presentation', () => {
  it('uses Vietnamese labels for known tags and readable fallback labels', () => {
    expect(getTagLabel('wifi')).toBe('Có Wi-Fi')
    expect(getTagLabel('new_tag')).toBe('new tag')
  })

  it('formats always-open and scheduled opening hours', () => {
    expect(getOpeningHoursRows({ status: 'always_open', periods: [] })).toEqual([
      { dayLabel: 'Mỗi ngày', hours: 'Mở cửa 24 giờ' },
    ])
    expect(getOpeningHoursRows({
      status: 'scheduled',
      periods: [
        { dayOfWeek: 7, ranges: [{ open: '09:00', close: '18:00' }] },
        { dayOfWeek: 1, ranges: [{ open: '08:00', close: '12:00' }, { open: '13:00', close: '17:00' }] },
      ],
    })).toEqual([
      { dayLabel: 'Thứ Hai', hours: '08:00–12:00, 13:00–17:00' },
      { dayLabel: 'Chủ Nhật', hours: '09:00–18:00' },
    ])
  })

  it('formats rating summaries', () => {
    expect(getRatingLabel({ averageRating: 4.25, reviewCount: 8 })).toBe('4.3 (8)')
    expect(getRatingLabel({ averageRating: 0, reviewCount: 0 })).toBe('Chưa có đánh giá')
  })
})
