import { importLibrary, setOptions } from '@googlemaps/js-api-loader'

let configured = false
let authenticationError = ''
let authenticationFailureHandlerInstalled = false
const authenticationFailureListeners = new Set()

function installAuthenticationFailureHandler() {
  if (authenticationFailureHandlerInstalled) return
  const previousHandler = window.gm_authFailure
  window.gm_authFailure = () => {
    previousHandler?.()
    authenticationError = 'Google Maps từ chối xác thực. Hãy kiểm tra Billing, Maps JavaScript API và HTTP referrer của API key.'
    authenticationFailureListeners.forEach((listener) => listener(authenticationError))
  }
  authenticationFailureHandlerInstalled = true
}

function ensureConfigured() {
  if (configured) return

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID?.trim()
  if (!apiKey) {
    throw new Error('Thiếu VITE_GOOGLE_MAPS_API_KEY. Hãy cấu hình khóa Google Maps cho frontend.')
  }
  if (!mapId) {
    throw new Error('Thiếu VITE_GOOGLE_MAPS_MAP_ID. Advanced Marker cần một Google Map ID hợp lệ.')
  }

  installAuthenticationFailureHandler()
  setOptions({
    key: apiKey,
    v: 'weekly',
    language: 'vi',
    region: 'VN',
    mapIds: [mapId],
  })
  configured = true
}

export function subscribeGoogleMapsAuthenticationFailure(listener) {
  authenticationFailureListeners.add(listener)
  if (authenticationError) listener(authenticationError)
  return () => authenticationFailureListeners.delete(listener)
}

async function loadLibrary(name, fallbackMessage) {
  try {
    ensureConfigured()
    return await importLibrary(name)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Thiếu VITE_')) throw error
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`${fallbackMessage} ${detail}`, { cause: error })
  }
}

export function getGoogleMapsMapId() {
  ensureConfigured()
  return import.meta.env.VITE_GOOGLE_MAPS_MAP_ID.trim()
}

export const loadMapsLibrary = () => loadLibrary('maps', 'Không thể tải thư viện Google Maps.')
export const loadMarkerLibrary = () => loadLibrary('marker', 'Không thể tải marker Google Maps.')
export const loadPlacesLibrary = () => loadLibrary('places', 'Không thể tải Google Places.')
export const loadGeocodingLibrary = () => loadLibrary('geocoding', 'Không thể tải Google Geocoding.')
