export const HUE_CENTER = Object.freeze({ lat: 16.4637, lng: 107.5909 })

export function hasMapPosition(value) {
  return Number.isFinite(value?.lat) && Number.isFinite(value?.lng)
}

export function toLatLngLiteral(value) {
  if (!value) return null
  const lat = typeof value.lat === 'function' ? value.lat() : value.lat
  const lng = typeof value.lng === 'function' ? value.lng() : value.lng
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

function componentValue(component) {
  return component?.longText ?? component?.long_name ?? component?.shortText ?? component?.short_name ?? ''
}

function findAddressComponent(components, type) {
  return (components ?? []).find((component) => component.types?.includes(type))
}

export function buildAddressSuggestion(addressResult) {
  const components = addressResult?.addressComponents ?? addressResult?.address_components ?? []
  const streetNumber = componentValue(findAddressComponent(components, 'street_number')).trim()
  const route = componentValue(findAddressComponent(components, 'route')).trim()
  const suggestedAddressLine = [streetNumber, route].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()

  return {
    formattedAddress: (
      addressResult?.formattedAddress
      ?? addressResult?.formatted_address
      ?? ''
    ).trim(),
    suggestedAddressLine: suggestedAddressLine || null,
  }
}

export function normalizeLocationAddressLine(value) {
  return value.trim().replace(/\s+/g, ' ')
}

export function detachAdvancedMarker(marker) {
  if (!marker) return
  try {
    marker.map = null
  } catch {
    // A marker created while Maps authentication is failing can have an
    // incomplete internal DOM root. HTMLElement.remove() avoids its map setter.
    try {
      marker.remove?.()
    } catch {
      // Cleanup must never take down the React route.
    }
  }
}

export function googleMapsSearchUrl(latitude, longitude) {
  const query = encodeURIComponent(`${latitude},${longitude}`)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

export function googleMapsDirectionsUrl(latitude, longitude) {
  const destination = encodeURIComponent(`${latitude},${longitude}`)
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`
}
