import { describe, expect, it } from 'vitest'
import { getActiveCategories } from './categoryUtils'

describe('getActiveCategories', () => {
  it('removes inactive entries and sorts by sortOrder', () => {
    const categories = [
      { code: 'b', name: 'B', sortOrder: 2, isActive: true },
      { code: 'off', name: 'Off', sortOrder: 0, isActive: false },
      { code: 'a', name: 'A', sortOrder: 1, isActive: true },
    ]
    expect(getActiveCategories(categories).map((item) => item.code)).toEqual(['a', 'b'])
  })
})
