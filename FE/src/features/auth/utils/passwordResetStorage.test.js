import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearPasswordResetState,
  getPasswordResetState,
  savePasswordResetState,
} from './passwordResetStorage'

describe('password reset session storage', () => {
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

  it('stores only reset metadata and excludes credentials', () => {
    savePasswordResetState({
      email: 'user@example.com',
      maskedEmail: 'u***@example.com',
      expiresAt: '2026-08-25T12:10:00.000Z',
      resendAvailableAt: '2026-08-25T12:01:00.000Z',
      code: '123456',
      newPassword: 'must-not-be-saved',
    })

    const stored = getPasswordResetState()
    expect(stored).toEqual({
      email: 'user@example.com',
      maskedEmail: 'u***@example.com',
      expiresAt: '2026-08-25T12:10:00.000Z',
      resendAvailableAt: '2026-08-25T12:01:00.000Z',
    })
    expect(JSON.stringify(stored)).not.toContain('123456')
    expect(JSON.stringify(stored)).not.toContain('must-not-be-saved')
  })

  it('clears reset metadata after completion', () => {
    savePasswordResetState({
      email: 'user@example.com',
      maskedEmail: 'u***@example.com',
      expiresAt: '2026-08-25T12:10:00.000Z',
      resendAvailableAt: '2026-08-25T12:01:00.000Z',
    })
    clearPasswordResetState()
    expect(getPasswordResetState()).toBeNull()
  })
})
