import { describe, expect, it } from 'vitest'
import {
  buildSearchFilterItems,
  clearTagGroup,
  getSelectedCodesForGroup,
  getTagState,
  removeSelectedTag,
  setTagRequired,
  toggleTagPriority,
} from './locationFilterState'

const multipleGroup = { selectionMode: 'multiple', tags: [{ code: 'quiet' }, { code: 'outdoor' }] }
const singleGroup = { selectionMode: 'single', tags: [{ code: 'free' }, { code: 'budget' }] }

describe('unified location filter state', () => {
  it('moves a tag from none to required', () => {
    expect(setTagRequired({ requiredTagCodes: [], preferredTagCodes: [], group: multipleGroup, code: 'quiet' }))
      .toEqual({ requiredTagCodes: ['quiet'], preferredTagCodes: [] })
  })

  it('removes a required tag on the next checkbox click', () => {
    expect(setTagRequired({ requiredTagCodes: ['quiet'], preferredTagCodes: [], group: multipleGroup, code: 'quiet' }))
      .toEqual({ requiredTagCodes: [], preferredTagCodes: [] })
  })

  it('promotes a preferred tag to required', () => {
    expect(setTagRequired({ requiredTagCodes: [], preferredTagCodes: ['quiet'], group: multipleGroup, code: 'quiet' }))
      .toEqual({ requiredTagCodes: ['quiet'], preferredTagCodes: [] })
  })

  it('toggles required and preferred from an active chip', () => {
    expect(toggleTagPriority({ requiredTagCodes: ['quiet'], preferredTagCodes: [], code: 'quiet' }))
      .toEqual({ requiredTagCodes: [], preferredTagCodes: ['quiet'] })
    expect(toggleTagPriority({ requiredTagCodes: [], preferredTagCodes: ['quiet'], code: 'quiet' }))
      .toEqual({ requiredTagCodes: ['quiet'], preferredTagCodes: [] })
  })

  it('removes a selected tag from either priority set', () => {
    expect(removeSelectedTag({ requiredTagCodes: ['quiet'], preferredTagCodes: ['outdoor'], code: 'quiet' }))
      .toEqual({ requiredTagCodes: [], preferredTagCodes: ['outdoor'] })
    expect(removeSelectedTag({ requiredTagCodes: ['quiet'], preferredTagCodes: ['outdoor'], code: 'outdoor' }))
      .toEqual({ requiredTagCodes: ['quiet'], preferredTagCodes: [] })
  })

  it('replaces required or preferred values in a single group', () => {
    expect(setTagRequired({ requiredTagCodes: ['free'], preferredTagCodes: [], group: singleGroup, code: 'budget' }))
      .toEqual({ requiredTagCodes: ['budget'], preferredTagCodes: [] })
    expect(setTagRequired({ requiredTagCodes: [], preferredTagCodes: ['free'], group: singleGroup, code: 'budget' }))
      .toEqual({ requiredTagCodes: ['budget'], preferredTagCodes: [] })
  })

  it('keeps required and preferred sets disjoint', () => {
    const next = setTagRequired({ requiredTagCodes: ['quiet'], preferredTagCodes: ['quiet', 'outdoor'], group: multipleGroup, code: 'outdoor' })
    expect(next).toEqual({ requiredTagCodes: ['quiet', 'outdoor'], preferredTagCodes: [] })
  })

  it('reads and clears the selected values for a group', () => {
    expect(getTagState([], ['quiet'], 'quiet')).toBe('preferred')
    expect(getSelectedCodesForGroup(['quiet'], ['outdoor'], multipleGroup)).toEqual(['quiet', 'outdoor'])
    expect(clearTagGroup({ requiredTagCodes: ['quiet', 'wifi'], preferredTagCodes: ['outdoor'], group: multipleGroup }))
      .toEqual({ requiredTagCodes: ['wifi'], preferredTagCodes: [] })
  })

  it('builds search chips without losing priority', () => {
    expect(buildSearchFilterItems({
      category: { code: 'cafe', name: 'Cà phê' }, ward: null,
      requiredTags: [{ code: 'quiet', name: 'Yên tĩnh' }],
      preferredTags: [{ code: 'outdoor', name: 'Ngoài trời' }],
      openCondition: { label: 'Đang mở cửa' },
    })).toEqual([
      { type: 'category', code: 'cafe', label: 'Cà phê' },
      { type: 'required', code: 'quiet', label: 'Yên tĩnh', priority: 'required' },
      { type: 'preferred', code: 'outdoor', label: 'Ngoài trời', priority: 'preferred' },
      { type: 'opening', code: 'opening-hours', label: 'Đang mở cửa' },
    ])
  })
})
