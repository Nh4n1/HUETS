import { describe, expect, it } from 'vitest'
import { hasReviewChanges, normalizeReviewFormValues } from './reviewForm'

describe('location review form', () => {
  it('normalizes rating and trims the optional comment', () => {
    expect(normalizeReviewFormValues({ rating: '5', comment: '  Rất đẹp  ' })).toEqual({
      rating: 5,
      comment: 'Rất đẹp',
    })
  })

  it('does not report a change when normalized values match the current review', () => {
    expect(hasReviewChanges(
      { rating: 5, comment: 'Rất đẹp' },
      { rating: 5, comment: '  Rất đẹp  ' },
    )).toBe(false)
  })

  it('reports changes for a new review or changed rating/comment', () => {
    expect(hasReviewChanges(null, { rating: 5, comment: '' })).toBe(true)
    expect(hasReviewChanges({ rating: 4, comment: 'Đẹp' }, { rating: 5, comment: 'Đẹp' })).toBe(true)
    expect(hasReviewChanges({ rating: 5, comment: 'Đẹp' }, { rating: 5, comment: 'Rất đẹp' })).toBe(true)
  })
})
