export const emptyItem = () => ({
  locationId: '',
  location: null,
  startTime: '',
  endTime: '',
  durationMinutes: '',
  note: '',
})

export const emptyDay = () => ({ items: [emptyItem()] })

const categoryMinutes = {
  historical_site: 120,
  religious_site: 90,
  museum_cultural: 90,
  craft_village: 90,
  natural_attraction: 120,
  cafe: 60,
  restaurant: 75,
  market_shopping: 90,
  entertainment: 120,
}

export const recommendedVisitMinutes = (location) => categoryMinutes[location?.category?.code] ?? 90

export const createItemFromLocation = (location) => ({
  ...emptyItem(),
  locationId: location.id,
  location,
  durationMinutes: recommendedVisitMinutes(location),
})

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
    status: itinerary.status ?? 'active',
    moderation: itinerary.moderation ?? null,
    days: itinerary.days?.map((day) => ({
      items: [...day.items]
        .sort((left, right) => left.order - right.order)
        .map((item) => ({
          locationId: item.locationId ?? '',
          location: item.location ?? null,
          startTime: item.startTime ?? '',
          endTime: item.endTime ?? '',
          durationMinutes: item.durationMinutes ?? '',
          note: item.note ?? '',
        })),
    })) ?? [emptyDay()],
  }
}

export function aiDraftToForm(plan) {
  return {
    title: plan.title ?? '',
    description: '',
    startDate: dateInputValue(plan.request?.startDate),
    visibility: 'private',
    status: 'active',
    days: plan.days?.map((day) => ({
      items: day.items.map((item) => ({
        id: item.id,
        locationId: item.locationId,
        location: item.location,
        startTime: item.startTime ?? '',
        endTime: item.endTime ?? '',
        durationMinutes: item.durationMinutes ?? '',
        note: item.note ?? '',
      })),
    })) ?? [],
  }
}

export function formToAiDraftPayload(form) {
  return {
    title: form.title.trim(),
    days: form.days.map((day, dayIndex) => ({
      dayNumber: dayIndex + 1,
      items: day.items.map((item) => ({
        locationId: item.locationId,
        suggestedStartTime: item.startTime,
        durationMinutes: Number(item.durationMinutes),
        note: item.note.trim() || null,
      })),
    })),
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
      if (startMinutes !== null && item.durationMinutes !== '' && startMinutes + Number(item.durationMinutes) > 24 * 60) {
        return `Ngày ${dayIndex + 1}, điểm ${itemIndex + 1}: thời gian kết thúc vượt quá một ngày.`
      }
    }
  }
  return ''
}

export function getItineraryFormErrors(form) {
  const errors = { title: '', items: {} }
  if (!form.title.trim()) errors.title = 'Vui lòng nhập tên lịch trình.'

  form.days.forEach((day, dayIndex) => {
    const seen = new Set()
    day.items.forEach((item, itemIndex) => {
      const itemErrors = {}
      if (!item.locationId) itemErrors.locationId = 'Vui lòng chọn địa điểm.'
      if (item.locationId && seen.has(item.locationId)) itemErrors.locationId = 'Địa điểm này đã có trong ngày.'
      if (item.locationId) seen.add(item.locationId)

      const startMinutes = toMinutes(item.startTime)
      const endMinutes = toMinutes(item.endTime)
      if (item.startTime && item.endTime && startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes) {
        itemErrors.durationMinutes = 'Thời gian kết thúc phải sau thời gian bắt đầu.'
      }
      if (item.durationMinutes !== '' && Number(item.durationMinutes) < 1) {
        itemErrors.durationMinutes = 'Thời lượng phải lớn hơn 0 phút.'
      }
      if (startMinutes !== null && item.durationMinutes !== '' && startMinutes + Number(item.durationMinutes) > 24 * 60) {
        itemErrors.durationMinutes = 'Thời gian kết thúc không được vượt quá 24:00.'
      }
      if (Object.keys(itemErrors).length) errors.items[`${dayIndex}:${itemIndex}`] = itemErrors
    })
  })

  return errors
}
