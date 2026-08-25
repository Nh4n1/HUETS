const STORAGE_KEY = 'huetrip.registrationVerification'

export function saveRegistrationVerification(value) {
  const safeValue = {
    registrationId: value.registrationId,
    maskedEmail: value.maskedEmail,
    expiresAt: value.expiresAt,
    resendAvailableAt: value.resendAvailableAt,
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safeValue))
  return safeValue
}

export function getRegistrationVerification() {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY))
    if (
      typeof value?.registrationId !== 'string'
      || typeof value?.maskedEmail !== 'string'
      || Number.isNaN(Date.parse(value?.expiresAt))
      || Number.isNaN(Date.parse(value?.resendAvailableAt))
    ) {
      return null
    }
    return value
  } catch {
    return null
  }
}

export function clearRegistrationVerification() {
  sessionStorage.removeItem(STORAGE_KEY)
}
