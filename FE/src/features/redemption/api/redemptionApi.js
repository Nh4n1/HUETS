import { httpClient } from '../../../shared/api/httpClient'
import { redemptionDeviceClient } from './redemptionDeviceClient'

export async function getRedemptionDevicesApi(locationId) {
  const response = await httpClient.get(`/business/locations/${locationId}/redemption-devices`)
  return response.data
}

export async function createDeviceActivationCodeApi(locationId, name) {
  const response = await httpClient.post(`/business/locations/${locationId}/device-activation-codes`, { name })
  return response.data
}

export async function revokeRedemptionDeviceApi(locationId, deviceId) {
  const response = await httpClient.delete(`/business/locations/${locationId}/redemption-devices/${deviceId}`)
  return response.data
}

export async function createRedemptionSessionApi(claimId) {
  const response = await httpClient.post(`/me/voucher-claims/${claimId}/redemption-sessions`)
  return response.data
}

export async function getVoucherClaimStatusApi(claimId) {
  const response = await httpClient.get(`/me/voucher-claims/${claimId}/status`)
  return response.data
}

export async function activateRedemptionDeviceApi(activationCode) {
  const response = await redemptionDeviceClient.post('/redeem-device/activate', { activationCode })
  return response.data
}

export async function getRedemptionDeviceSessionApi() {
  const response = await redemptionDeviceClient.get('/redeem-device/session')
  return response.data
}

export async function logoutRedemptionDeviceApi() {
  const response = await redemptionDeviceClient.post('/redeem-device/logout')
  return response.data
}

export async function verifyVoucherRedemptionApi(payload) {
  const response = await redemptionDeviceClient.post('/redeem-device/redemptions/verify', payload)
  return response.data
}

export async function confirmVoucherRedemptionApi(verificationToken) {
  const response = await redemptionDeviceClient.post('/redeem-device/redemptions/confirm', { verificationToken })
  return response.data
}
