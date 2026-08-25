const STORAGE_KEY = 'huetrip.passwordReset'

export function savePasswordResetState(value) {
  const safeValue = {
    email: value.email,
    maskedEmail: value.maskedEmail,
    expiresAt: value.expiresAt,
    resendAvailableAt: value.resendAvailableAt,
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safeValue))
  return safeValue
}

export function getPasswordResetState() {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY))
    if (
      typeof value?.email !== 'string'
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

export function clearPasswordResetState() {
  sessionStorage.removeItem(STORAGE_KEY)
}
