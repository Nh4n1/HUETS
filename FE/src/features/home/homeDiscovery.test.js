import { describe, expect, it } from 'vitest'
import { pickDiverseLocations } from './homeDiscovery'

const location = (id, code) => ({ id, category: { code } })

describe('pickDiverseLocations', () => {
  it('prefers one location per category and preserves candidate order', () => {
    const candidates = [location('a', 'cafe'), location('b', 'cafe'), location('c', 'museum'), location('d', 'market')]
    expect(pickDiverseLocations(candidates, 3).map((item) => item.id)).toEqual(['a', 'c', 'd'])
  })

  it('fills remaining slots from the original ranking', () => {
    const candidates = [location('a', 'cafe'), location('b', 'cafe'), location('c', 'museum')]
    expect(pickDiverseLocations(candidates, 3).map((item) => item.id)).toEqual(['a', 'c', 'b'])
  })
})
