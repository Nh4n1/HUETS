import { httpClient } from '../../../shared/api/httpClient'
import {
  confirmOwnershipEvidenceUploadApi,
  getOwnershipEvidenceSignatureApi,
  uploadFileToCloudinary,
} from '../../../shared/api/uploadApi'

export async function getBusinessSummaryApi() {
  const response = await httpClient.get('/me/business-summary')
  return response.data
}

export async function getBusinessLocationsApi() {
  const response = await httpClient.get('/business/locations')
  return response.data
}

export async function createOwnershipApi(payload) {
  const response = await httpClient.post('/location-ownerships', payload)
  return response.data
}

export async function getMyOwnershipsApi(params = {}) {
  const response = await httpClient.get('/me/location-ownerships', { params })
  return response.data
}

export async function getMyOwnershipApi(ownershipId) {
  const response = await httpClient.get(`/me/location-ownerships/${ownershipId}`)
  return response.data
}

export async function updateMyOwnershipApi(ownershipId, payload) {
  const response = await httpClient.patch(`/me/location-ownerships/${ownershipId}`, payload)
  return response.data
}

export async function resubmitOwnershipApi(ownershipId) {
  const response = await httpClient.post(`/me/location-ownerships/${ownershipId}/resubmit`)
  return response.data
}

export async function cancelOwnershipApi(ownershipId) {
  const response = await httpClient.post(`/me/location-ownerships/${ownershipId}/cancel`)
  return response.data
}

export async function getLocationOwnershipContextApi(locationId) {
  const response = await httpClient.get(`/locations/${locationId}/ownership-context`)
  return response.data
}

export async function uploadOwnershipEvidenceFiles(files) {
  const signature = await getOwnershipEvidenceSignatureApi()
  const uploaded = await Promise.all(
    files.map((file) => uploadFileToCloudinary(file.originFileObj ?? file, signature)),
  )
  const confirmed = await confirmOwnershipEvidenceUploadApi(
    uploaded.map((item) => ({
      secureUrl: item.secure_url,
      publicId: item.public_id,
      bytes: item.bytes,
      format: item.format,
    })),
  )
  return confirmed.assets
}
