import { describe, expect, it } from 'vitest'
import { getBusinessNavigation } from './businessNavigation'

describe('business navigation', () => {
  it.each([
    ['none', '/business/register'],
    ['has_requests', '/business/ownerships'],
    ['active_owner', '/business'],
  ])('maps %s to the intended workspace entry', (menuState, destination) => {
    expect(getBusinessNavigation(menuState).to).toBe(destination)
  })

  it('uses onboarding when the summary is not available', () => {
    expect(getBusinessNavigation(undefined)).toEqual(getBusinessNavigation('none'))
  })
})
