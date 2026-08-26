import {
  httpClient
} from '../../../shared/api/httpClient'

const REVIEW_CACHE_TTL = 30_000
const REVIEW_CACHE_MAX_SIZE = 100
const reviewCache = new Map()

function reviewCacheKey(locationId, params) {
  return [
    locationId,
    params.rating ?? 'all',
    params.sortBy ?? 'newest',
    params.hasComment ?? false,
    params.page ?? 1,
    params.pageSize ?? 10,
  ].join(':')
}

function storeReviewCache(key, value) {
  if (reviewCache.size >= REVIEW_CACHE_MAX_SIZE) {
    reviewCache.delete(reviewCache.keys().next().value)
  }
  reviewCache.set(key, { value, expiresAt: Date.now() + REVIEW_CACHE_TTL })
}

export function clearLocationReviewsCache(locationId) {
  const prefix = `${locationId}:`
  for (const key of reviewCache.keys()) {
    if (key.startsWith(prefix)) reviewCache.delete(key)
  }
}

export async function getPublicLocationsApi(params = {}) {
  const response = await httpClient.get('/locations', {
    params
  })
  return response.data
}

export async function searchPublicLocationsApi(params = {}, options = {}) {
  // Public list accepts the same basic search filters. Using the canonical
  // collection endpoint also keeps the page compatible with a backend
  // process started before the optional /locations/search alias was added.
  const response = await httpClient.get('/locations', {
    params,
    signal: options.signal,
  })
  return response.data
}

export async function searchGeocodingPlacesApi(query, options = {}) {
  const response = await httpClient.get('/locations/geocode/search', {
    params: { q: query },
    signal: options.signal,
  })
  return response.data
}

export async function getPublicLocationByIdApi(locationId) {
  const response = await httpClient.get(`/locations/${locationId}`)
  return response.data
}

export async function getLocationReviewsApi(locationId, params = {}, options = {}) {
  const cacheKey = reviewCacheKey(locationId, params)
  const cached = reviewCache.get(cacheKey)
  if (!options.forceRefresh && cached?.expiresAt > Date.now()) {
    return cached.value
  }
  if (cached) reviewCache.delete(cacheKey)

  const response = await httpClient.get(`/locations/${locationId}/reviews`, {
    params,
    signal: options.signal,
  })
  const result = {
    data: response.data.data,
    meta: response.data.meta
  }
  storeReviewCache(cacheKey, result)
  return result
}

export async function getMyLocationReviewApi(locationId) {
  const response = await httpClient.get(`/locations/${locationId}/reviews/me`)
  return response.data
}

export async function saveLocationReviewApi(locationId, data) {
  const response = await httpClient.put(`/locations/${locationId}/reviews/me`, data)
  clearLocationReviewsCache(locationId)
  return response.data
}

export async function deleteMyLocationReviewApi(locationId) {
  const response = await httpClient.delete(`/locations/${locationId}/reviews/me`)
  clearLocationReviewsCache(locationId)
  return response.data
}
