import { describe, expect, it } from 'vitest'
import { getDerivedOwnershipState, getLatestReview, RELATIONSHIP_LABEL } from './ownershipPresentation'

describe('ownership presentation', () => {
  it('prioritizes pending Location moderation over pending ownership copy', () => {
    expect(getDerivedOwnershipState({ status: 'pending', location: { status: 'pending' } }).label)
      .toBe('Đang kiểm duyệt địa điểm')
  })

  it('uses authorized_manager from the accepted business baseline', () => {
    expect(RELATIONSHIP_LABEL.authorized_manager).toBe('Quản lý được ủy quyền')
  })

  it('returns the latest relevant review without mutating history', () => {
    const history = [
      { action: 'rejected', reason: 'Lần một' },
      { action: 'resubmitted' },
      { action: 'rejected', reason: 'Lần hai' },
    ]
    expect(getLatestReview({ reviewHistory: history }).reason).toBe('Lần hai')
    expect(history[0].reason).toBe('Lần một')
  })
})
