export function createLocationBookmark(location) {
  const coverImageUrl =
    location.coverImageUrl
    ?? (typeof location.images?.[0] === 'string' ? location.images[0] : location.images?.[0]?.url)
    ?? null

  return {
    targetType: 'location',
    targetId: location.id ?? location._id,

    snapshot: {
      name: location.name,

      coverImageUrl,

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
  const coverImageUrl =
    itinerary.coverImageUrl
    ?? itinerary.days
      ?.flatMap((day) => day.items ?? [])
      .find((item) => item.availability !== 'unavailable' && (item.location?.coverImageUrl || item.location?.images?.[0]))
      ?.location?.coverImageUrl
    ?? itinerary.days
      ?.flatMap((day) => day.items ?? [])
      .find((item) => item.location?.images?.[0])
      ?.location?.images?.[0]?.url
    ?? null

  return {
    targetType: 'itinerary',
    targetId: itinerary.id ?? itinerary._id,
    snapshot: {
      title: itinerary.title,
      description: itinerary.description ?? '',
      owner: itinerary.owner ?? null,
      dayCount: itinerary.days?.length ?? 0,
      itemCount: itinerary.days?.reduce(
        (total, day) => total + (day.items?.length ?? 0),
        0,
      ) ?? 0,
      coverImageUrl,
    },
  }
}
