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

export function createItineraryBookmark(itinerary) {
  return {
    targetType: 'itinerary',
    targetId: itinerary.id,
    snapshot: {
      title: itinerary.title,
      description: itinerary.description ?? '',
      owner: itinerary.owner ?? null,
      dayCount: itinerary.days?.length ?? 0,
      itemCount: itinerary.days?.reduce(
        (total, day) => total + (day.items?.length ?? 0),
        0,
      ) ?? 0,
      coverImageUrl: itinerary.days
        ?.flatMap((day) => day.items ?? [])
        .find((item) => item.availability !== 'unavailable' && item.location?.coverImageUrl)
        ?.location?.coverImageUrl ?? null,
    },
  }
}
