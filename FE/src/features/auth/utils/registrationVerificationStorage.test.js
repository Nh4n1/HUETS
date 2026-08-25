import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearRegistrationVerification,
  getRegistrationVerification,
  saveRegistrationVerification,
} from './registrationVerificationStorage'

describe('registration verification session storage', () => {
  let values

  beforeEach(() => {
    values = new Map()
    vi.stubGlobal('sessionStorage', {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('persists only non-sensitive registration metadata', () => {
    saveRegistrationVerification({
      registrationId: '507f1f77bcf86cd799439011',
      maskedEmail: 'u***@example.com',
      expiresAt: '2026-08-25T11:10:00.000Z',
      resendAvailableAt: '2026-08-25T11:01:00.000Z',
      password: 'must-not-be-saved',
      code: '123456',
    })

    const stored = getRegistrationVerification()
    expect(stored).toEqual({
      registrationId: '507f1f77bcf86cd799439011',
      maskedEmail: 'u***@example.com',
      expiresAt: '2026-08-25T11:10:00.000Z',
      resendAvailableAt: '2026-08-25T11:01:00.000Z',
    })
    expect(JSON.stringify(stored)).not.toContain('must-not-be-saved')
    expect(JSON.stringify(stored)).not.toContain('123456')
  })

  it('clears the pending registration metadata', () => {
    saveRegistrationVerification({
      registrationId: '507f1f77bcf86cd799439011',
      maskedEmail: 'u***@example.com',
      expiresAt: '2026-08-25T11:10:00.000Z',
      resendAvailableAt: '2026-08-25T11:01:00.000Z',
    })
    clearRegistrationVerification()
    expect(getRegistrationVerification()).toBeNull()
  })
})
