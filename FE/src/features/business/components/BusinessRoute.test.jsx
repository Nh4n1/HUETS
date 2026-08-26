import { describe, expect, it } from 'vitest'
import { canAccessBusinessWorkspace } from '../businessAccess'

describe('BusinessRoute access policy', () => {
  it('allows a regular user without requiring verified ownership', () => {
    expect(canAccessBusinessWorkspace({ role: 'user' })).toBe(true)
  })

  it('keeps admin and moderator workspaces separate', () => {
    expect(canAccessBusinessWorkspace({ role: 'admin' })).toBe(false)
    expect(canAccessBusinessWorkspace({ role: 'mod' })).toBe(false)
  })
})
