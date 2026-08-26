import { httpClient } from '../../../shared/api/httpClient'

export async function getOwnerVouchersApi(locationId, params = {}) {
  const response = await httpClient.get(`/business/locations/${locationId}/vouchers`, { params })
  return response.data
}

export async function createVoucherApi(locationId, payload) {
  const response = await httpClient.post(`/business/locations/${locationId}/vouchers`, payload)
  return response.data
}

export async function getOwnerVoucherApi(locationId, voucherId) {
  const response = await httpClient.get(`/business/locations/${locationId}/vouchers/${voucherId}`)
  return response.data
}

export async function updateVoucherApi(locationId, voucherId, payload) {
  const response = await httpClient.patch(`/business/locations/${locationId}/vouchers/${voucherId}`, payload)
  return response.data
}

export async function deleteVoucherApi(locationId, voucherId) {
  const response = await httpClient.delete(`/business/locations/${locationId}/vouchers/${voucherId}`)
  return response.data
}

export async function transitionVoucherApi(locationId, voucherId, action) {
  const response = await httpClient.post(`/business/locations/${locationId}/vouchers/${voucherId}/${action}`)
  return response.data
}

export async function getPublicLocationVouchersApi(locationId) {
  const response = await httpClient.get(`/locations/${locationId}/vouchers`)
  return response.data
}

export async function getPublicVoucherApi(voucherId) {
  const response = await httpClient.get(`/vouchers/${voucherId}`)
  return response.data
}

export async function claimVoucherApi(voucherId) {
  const response = await httpClient.post(`/vouchers/${voucherId}/claims`)
  return response.data
}

export async function getMyVoucherClaimsApi() {
  const response = await httpClient.get('/me/voucher-claims')
  return response.data
}

export async function getMyVoucherClaimApi(claimId) {
  const response = await httpClient.get(`/me/voucher-claims/${claimId}`)
  return response.data
}
