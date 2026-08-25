import { describe, expect, it } from 'vitest'
import { validateScheduleItem } from './validateScheduleItem'

const location = {
  id: 'location-1',
  name: 'Đại Nội',
  status: 'approved',
  openingHours: { status: 'scheduled', periods: [{ dayOfWeek: 1, ranges: [{ open: '06:00', close: '10:00' }] }] },
}
const validate = (startTime, durationMinutes) => validateScheduleItem({
  item: { startTime, durationMinutes }, location, startDate: '2026-08-10', dayNumber: 1,
})

describe('local itinerary schedule validation', () => {
  it('accepts a visit inside opening hours', () => expect(validate('08:00', 60)).toEqual([]))
  it('rejects a visit outside opening hours', () => expect(validate('19:00', 60)[0].code).toBe('OUTSIDE_OPENING_HOURS'))
  it('checks the full duration against closing time', () => {
    expect(validate('09:30', 60)[0].code).toBe('OUTSIDE_OPENING_HOURS')
    expect(validate('09:30', 30)).toEqual([])
  })
  it('warns for unknown hours', () => {
    const issues = validateScheduleItem({ item: {}, location: { ...location, openingHours: { status: 'unknown' } }, dayNumber: 1 })
    expect(issues[0]).toMatchObject({ level: 'warning', code: 'OPENING_HOURS_UNKNOWN' })
  })
})
