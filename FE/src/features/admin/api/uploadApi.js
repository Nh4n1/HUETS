import axios from 'axios'
import { httpClient } from '../../../shared/api/httpClient'

export async function getUploadSignatureApi() {
  const response = await httpClient.get('/uploads/location-images/signature')
  return response.data
}

// Uploads directly to Cloudinary using a signed payload minted by the BE.
// Uses a bare axios call (not httpClient) so no auth cookies/headers leak to Cloudinary.
export async function uploadFileToCloudinary(file, signatureData) {
  const { cloudName, apiKey, timestamp, folder, allowedFormats, signature } = signatureData

  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', apiKey)
  formData.append('timestamp', timestamp)
  formData.append('signature', signature)
  formData.append('folder', folder)
  formData.append('allowed_formats', allowedFormats)

  const response = await axios.post(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    formData,
  )
  return response.data
}

export async function confirmUploadApi(results) {
  const response = await httpClient.post('/uploads/location-images', { results })
  return response.data
}

// Best-effort cleanup for images already uploaded to Cloudinary but never
// confirmed/attached to a location (e.g. the create-location request failed).
export async function deleteUploadedImageApi(publicId) {
  const response = await httpClient.post('/uploads/location-images/delete', { publicId })
  return response.data
}
