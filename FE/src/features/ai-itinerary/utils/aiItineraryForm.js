export const INITIAL_FORM_STATE = {
  durationDays: 2,
  startDate: '',
  dailyTimeRange: { start: '08:00', end: '20:00' },
  origin: {
    type: 'map_point',
    coordinates: [107.5902, 16.4631],
  },
  transport: 'motorcycle',
  pace: 'moderate',
  preferences: {
    categoryCodes: [],
    requiredTagCodes: [],
    preferredTagCodes: [],
    avoidTagCodes: [],
    priceLevels: [],
  },
  mustVisitLocations: [], // Array of { _id/id, name, address, image }
  preferenceText: '',
}

export function validateStepOne(formState) {
  const errors = {}

  if (!formState.durationDays || formState.durationDays < 1 || formState.durationDays > 14) {
    errors.durationDays = 'Số ngày phải từ 1 đến 14 ngày.'
  }

  if (formState.dailyTimeRange.start >= formState.dailyTimeRange.end) {
    errors.dailyTimeRange = 'Giờ kết thúc phải lớn hơn giờ bắt đầu.'
  }

  if (!formState.origin || !formState.origin.type) {
    errors.origin = 'Vui lòng chọn điểm xuất phát.'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

export function validateStepTwo(formState) {
  const errors = {}

  if (!formState.preferenceText || formState.preferenceText.trim().length === 0) {
    errors.preferenceText = 'Vui lòng nhập mô tả chuyến đi của bạn.'
  } else if (formState.preferenceText.trim().length > 500) {
    errors.preferenceText = 'Mô tả không được vượt quá 500 ký tự.'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

export function buildGeneratePayload(formState) {
  return {
    durationDays: Number(formState.durationDays),
    startDate: formState.startDate || null,
    dailyTimeRange: formState.dailyTimeRange,
    origin: formState.origin,
    transport: formState.transport,
    pace: formState.pace,
    preferences: formState.preferences,
    mustVisitLocationIds: formState.mustVisitLocations.map((loc) => loc._id || loc.id),
    preferenceText: formState.preferenceText.trim(),
  }
}
