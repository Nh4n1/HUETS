const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_TOTAL_SIZE = 20 * 1024 * 1024

export function validateEvidenceFiles(fileList) {
  if (fileList.length < 1 || fileList.length > 5) return 'Vui lòng chọn từ 1 đến 5 ảnh bằng chứng.'
  if (fileList.some((file) => !ALLOWED_TYPES.has((file.originFileObj ?? file).type))) {
    return 'Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP; không hỗ trợ PDF.'
  }
  if (fileList.some((file) => (file.originFileObj ?? file).size > MAX_FILE_SIZE)) {
    return 'Mỗi ảnh không được vượt quá 5 MB.'
  }
  const total = fileList.reduce((sum, file) => sum + (file.originFileObj ?? file).size, 0)
  return total > MAX_TOTAL_SIZE ? 'Tổng dung lượng ảnh không được vượt quá 20 MB.' : ''
}
