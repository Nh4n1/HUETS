export const emptyItem = () => ({
  locationId: '',
  startTime: '',
  endTime: '',
  durationMinutes: '',
  note: '',
})

export const emptyDay = () => ({ items: [emptyItem()] })

export const emptyItineraryForm = () => ({
  title: '',
  description: '',
  startDate: '',
  visibility: 'private',
  days: [emptyDay()],
})

const dateInputValue = (value) => value ? String(value).slice(0, 10) : ''

export function itineraryToForm(itinerary) {
  return {
    title: itinerary.title ?? '',
    description: itinerary.description ?? '',
    startDate: dateInputValue(itinerary.startDate),
    visibility: itinerary.visibility ?? 'private',
    days: itinerary.days?.map((day) => ({
      items: [...day.items]
        .sort((left, right) => left.order - right.order)
        .map((item) => ({
          locationId: item.locationId ?? '',
          startTime: item.startTime ?? '',
          endTime: item.endTime ?? '',
          durationMinutes: item.durationMinutes ?? '',
          note: item.note ?? '',
        })),
    })) ?? [emptyDay()],
  }
}

export function formToItineraryPayload(form) {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    startDate: form.startDate || null,
    visibility: form.visibility,
    days: form.days.map((day, dayIndex) => ({
      dayNumber: dayIndex + 1,
      items: day.items.map((item, itemIndex) => ({
        locationId: item.locationId,
        order: itemIndex + 1,
        startTime: item.startTime || null,
        endTime: item.endTime || null,
        durationMinutes: item.durationMinutes === '' ? null : Number(item.durationMinutes),
        note: item.note.trim() || null,
      })),
    })),
  }
}

const toMinutes = (value) => {
  if (!value || typeof value !== 'string') return null
  const [hours, minutes] = value.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

export function getItineraryFormError(form) {
  if (!form.title.trim()) return 'Vui lòng nhập tên lịch trình.'
  if (form.days.length === 0) return 'Lịch trình cần có ít nhất một ngày.'
  for (let dayIndex = 0; dayIndex < form.days.length; dayIndex += 1) {
    const day = form.days[dayIndex]
    if (!day.items.length) return `Ngày ${dayIndex + 1} cần có ít nhất một địa điểm.`
    const ids = day.items.map((item) => item.locationId)
    if (ids.some((id) => !id)) return `Vui lòng chọn đầy đủ địa điểm cho ngày ${dayIndex + 1}.`
    if (new Set(ids).size !== ids.length) return `Ngày ${dayIndex + 1} đang có địa điểm bị lặp.`

    for (let itemIndex = 0; itemIndex < day.items.length; itemIndex += 1) {
      const item = day.items[itemIndex]
      const startMinutes = toMinutes(item.startTime)
      const endMinutes = toMinutes(item.endTime)

      if (item.startTime && item.endTime && startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes) {
        return `Ngày ${dayIndex + 1}, điểm ${itemIndex + 1}: endTime phải sau startTime trong cùng ngày.`
      }
    }
  }
  return ''
}
