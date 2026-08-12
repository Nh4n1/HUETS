export function createLocationBookmark(location) {
  return {
    targetType: 'location',
    targetId: location.id,

    snapshot: {
      name: location.name,

      coverImageUrl:
        location.coverImageUrl
        ?? null,

      category:
        location.category
        ?? null,

      formattedAddress:
        location.formattedAddress
        ?? '',

      averageRating:
        location.averageRating
        ?? 0,

      reviewCount:
        location.reviewCount
        ?? 0,

      tagCodes:
        location.tagCodes
        ?? [],
    },
  }
}