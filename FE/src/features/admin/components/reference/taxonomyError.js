export function taxonomyErrorMessage(error, fallback) {
  const response = error.response?.data
  const usageCount = response?.details?.usageCount
  if (typeof usageCount === 'number') {
    return `${response.message} Hiện có ${usageCount} địa điểm đang sử dụng.`
  }
  return response?.message ?? fallback
}

export const TAXONOMY_CODE_RULES = [
  { required: true, whitespace: true, message: 'Vui lòng nhập code.' },
  {
    pattern: /^[a-z][a-z0-9_]{1,49}$/,
    message: 'Code gồm 2-50 ký tự chữ thường, số hoặc dấu gạch dưới.',
  },
]
