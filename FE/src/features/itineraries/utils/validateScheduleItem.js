const toMinutes = (value) => {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3))
}

const dayOfWeek = (startDate, dayNumber) => {
  const date = new Date(`${startDate}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + dayNumber - 1)
  return date.getUTCDay() === 0 ? 7 : date.getUTCDay()
}

export function validateScheduleItem({ item, location, startDate, dayNumber, dailyTimeRange }) {
  if (!location || location.status && location.status !== 'approved') {
    return [{ level: 'error', code: 'LOCATION_UNAVAILABLE', message: 'Địa điểm hiện không khả dụng.' }]
  }
  const issues = []
  const start = toMinutes(item.startTime)
  const duration = Number(item.durationMinutes)
  const end = start !== null && Number.isFinite(duration) && duration > 0 ? start + duration : null
  if (dailyTimeRange && start !== null && end !== null
    && (start < toMinutes(dailyTimeRange.start) || end > toMinutes(dailyTimeRange.end))) {
    issues.push({ level: 'error', code: 'DAILY_TIME_CONFLICT', message: `Thời gian phải nằm trong khung ${dailyTimeRange.start}–${dailyTimeRange.end}.` })
  }

  const opening = location.openingHours
  if (!opening || opening.status === 'unknown') {
    issues.push({ level: 'warning', code: 'OPENING_HOURS_UNKNOWN', message: 'Chưa xác minh giờ hoạt động của địa điểm.' })
    return issues
  }
  if (opening.status === 'always_open') return issues
  if (!startDate) {
    issues.push({ level: 'warning', code: 'TRIP_DATE_UNKNOWN', message: 'Chọn ngày bắt đầu để kiểm tra chính xác giờ hoạt động.' })
    return issues
  }
  const period = opening.periods?.find((candidate) => candidate.dayOfWeek === dayOfWeek(startDate, dayNumber))
  if (!period?.ranges?.length) {
    issues.push({ level: 'error', code: 'CLOSED_ON_TRIP_DAY', message: `${location.name ?? 'Địa điểm'} đóng cửa vào ngày đã chọn.` })
    return issues
  }
  if (start !== null && end !== null && !period.ranges.some((range) => start >= toMinutes(range.open) && end <= toMinutes(range.close))) {
    issues.push({
      level: 'error',
      code: 'OUTSIDE_OPENING_HOURS',
      message: `${location.name ?? 'Địa điểm'} chỉ mở ${period.ranges.map((range) => `${range.open}–${range.close}`).join(', ')}.`,
    })
  }
  return issues
}

export function validateDraftSchedule(form, dailyTimeRange) {
  const byItem = {}
  form.days.forEach((day, dayIndex) => {
    day.items.forEach((item, itemIndex) => {
      const issues = validateScheduleItem({
        item,
        location: item.location,
        startDate: form.startDate,
        dayNumber: dayIndex + 1,
        dailyTimeRange,
      })
      if (issues.length) byItem[`${dayIndex}:${itemIndex}`] = issues
    })
  })
  return {
    byItem,
    issues: Object.values(byItem).flat(),
  }
}
