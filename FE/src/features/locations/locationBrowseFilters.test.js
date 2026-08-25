import { describe, expect, it } from 'vitest'
import {
  buildBrowseFilterItems,
  buildBrowseResetParams,
  parseCodeList,
  removeBrowseFilter,
  replaceTagGroupSelection,
} from './locationBrowseFilters'

describe('browse location filter helpers', () => {
  it('parses a unique CSV code list', () => {
    expect(parseCodeList('wifi, quiet,wifi,,')).toEqual(['wifi', 'quiet'])
  })

  it('replaces only tags belonging to the changed group', () => {
    const group = { tags: [{ code: 'quiet' }, { code: 'outdoor' }] }
    expect(replaceTagGroupSelection(['wifi', 'quiet'], group, ['outdoor'])).toEqual(['wifi', 'outdoor'])
  })

  it('resolves labels and falls back to codes', () => {
    const filters = buildBrowseFilterItems({
      categoryCode: 'cafe', wardCode: 'phu_hoi', tagCodes: ['wifi', 'unknown'],
      categories: [{ code: 'cafe', name: 'Cà phê' }], wards: [{ code: 'phu_hoi', name: 'Phú Hội' }],
      tagGroups: [{ tags: [{ code: 'wifi', name: 'Wi-Fi' }] }],
    })
    expect(filters.map((item) => item.label)).toEqual(['Cà phê', 'Phú Hội', 'Wi-Fi', 'unknown'])
  })

  it('removing category also clears tags while keeping ward and sort', () => {
    const params = new URLSearchParams('categoryCode=cafe&wardCode=phu_hoi&tagCodes=wifi,quiet&sortBy=newest&page=3')
    expect(removeBrowseFilter(params, { type: 'category', code: 'cafe' }).toString())
      .toBe('wardCode=phu_hoi&sortBy=newest')
  })

  it('removes ward or one tag without losing other state', () => {
    const params = new URLSearchParams('categoryCode=cafe&wardCode=phu_hoi&tagCodes=wifi,quiet&sortBy=rating_desc')
    expect(removeBrowseFilter(params, { type: 'ward', code: 'phu_hoi' }).toString())
      .toBe('categoryCode=cafe&tagCodes=wifi%2Cquiet&sortBy=rating_desc')
    expect(removeBrowseFilter(params, { type: 'tag', code: 'wifi' }).toString())
      .toBe('categoryCode=cafe&wardCode=phu_hoi&tagCodes=quiet&sortBy=rating_desc')
  })

  it('clears filters while preserving explicit sort modes', () => {
    expect(buildBrowseResetParams('newest').toString()).toBe('sortBy=newest')
    expect(buildBrowseResetParams('rating_desc').toString()).toBe('sortBy=rating_desc')
    expect(buildBrowseResetParams('recommended').toString()).toBe('')
  })
})
