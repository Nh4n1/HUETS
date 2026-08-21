export function normalizeReviewFormValues(values = {}) {
  return {
    rating: Number(values.rating),
    comment: typeof values.comment === 'string' ? values.comment.trim() : '',
  }
}

export function hasReviewChanges(ownReview, values) {
  if (!ownReview) return true
  const normalized = normalizeReviewFormValues(values)
  return ownReview.rating !== normalized.rating || ownReview.comment !== normalized.comment
}
