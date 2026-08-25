import { EnvironmentOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { useEffect, useRef, useState } from 'react'
import {
  getGoogleMapsMapId,
  loadGeocodingLibrary,
  loadMapsLibrary,
  loadMarkerLibrary,
  loadPlacesLibrary,
  subscribeGoogleMapsAuthenticationFailure,
} from './googleMapsLoader'
import {
  buildAddressSuggestion,
  detachAdvancedMarker,
  hasMapPosition,
  HUE_CENTER,
  toLatLngLiteral,
} from './googleMapUtils'
import styles from './MapPointPicker.module.css'

const DEFAULT_ZOOM = 15
const SELECTED_ZOOM = 17

function geolocationMessage(error) {
  if (!navigator.geolocation) return 'Trình duyệt không hỗ trợ lấy vị trí hiện tại.'
  if (error?.code === error.PERMISSION_DENIED) return 'Bạn đã từ chối quyền truy cập vị trí.'
  if (error?.code === error.POSITION_UNAVAILABLE) return 'Thiết bị chưa xác định được vị trí hiện tại.'
  if (error?.code === error.TIMEOUT) return 'Yêu cầu lấy vị trí đã hết thời gian chờ.'
  return 'Không thể lấy vị trí hiện tại.'
}

export function MapPointPicker({
  value,
  onChange,
  readOnly = false,
  defaultCenter = HUE_CENTER,
  defaultZoom = DEFAULT_ZOOM,
  selectedZoom = SELECTED_ZOOM,
  onAddressResolved,
  onAddressStateChange,
  showCurrentLocation = true,
  showSearch = true,
}) {
  const mapCanvasRef = useRef(null)
  const searchAreaRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const listenersRef = useRef([])
  const autocompleteRef = useRef(null)
  const autocompleteListenerRef = useRef(null)
  const autocompleteErrorListenerRef = useRef(null)
  const geocodeRequestIdRef = useRef(0)
  const selectPositionRef = useRef(null)
  const callbacksRef = useRef({ onChange, onAddressResolved, onAddressStateChange })
  const settingsRef = useRef({ value, defaultCenter, defaultZoom, selectedZoom, showSearch })
  const [retryKey, setRetryKey] = useState(0)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState('')
  const [placesError, setPlacesError] = useState('')
  const [geolocationLoading, setGeolocationLoading] = useState(false)
  const [geolocationError, setGeolocationError] = useState('')
  const valueLat = value?.lat
  const valueLng = value?.lng

  useEffect(() => {
    settingsRef.current = { value, defaultCenter, defaultZoom, selectedZoom, showSearch }
  }, [defaultCenter, defaultZoom, selectedZoom, showSearch, value])

  useEffect(() => {
    callbacksRef.current = { onChange, onAddressResolved, onAddressStateChange }
  }, [onAddressResolved, onAddressStateChange, onChange])

  useEffect(() => {
    let active = true
    const unsubscribeAuthenticationFailure = subscribeGoogleMapsAuthenticationFailure((message) => {
      if (!active) return
      setMapReady(false)
      setMapError(message)
    })

    const clearGoogleObjects = () => {
      listenersRef.current.forEach((listener) => listener.remove())
      listenersRef.current = []
      if (autocompleteRef.current && autocompleteListenerRef.current) {
        autocompleteRef.current.removeEventListener('gmp-select', autocompleteListenerRef.current)
      }
      if (autocompleteRef.current && autocompleteErrorListenerRef.current) {
        autocompleteRef.current.removeEventListener('gmp-error', autocompleteErrorListenerRef.current)
      }
      autocompleteListenerRef.current = null
      autocompleteErrorListenerRef.current = null
      autocompleteRef.current = null
      if (searchAreaRef.current) searchAreaRef.current.replaceChildren()
      detachAdvancedMarker(markerRef.current)
      markerRef.current = null
      mapRef.current = null
      selectPositionRef.current = null
      geocodeRequestIdRef.current += 1
    }

    const publishAddressState = (state) => callbacksRef.current.onAddressStateChange?.(state)

    const reverseGeocode = async (position) => {
      const requestId = ++geocodeRequestIdRef.current
      publishAddressState({ loading: true, error: '' })
      try {
        const { Geocoder } = await loadGeocodingLibrary()
        const { results } = await new Geocoder().geocode({ location: position, region: 'VN' })
        if (!active || requestId !== geocodeRequestIdRef.current) return
        const result = results?.[0]
        callbacksRef.current.onAddressResolved?.(result ? buildAddressSuggestion(result) : null)
        publishAddressState({ loading: false, error: result ? '' : 'Google chưa xác định được địa chỉ tại điểm này.' })
      } catch {
        if (!active || requestId !== geocodeRequestIdRef.current) return
        callbacksRef.current.onAddressResolved?.(null)
        publishAddressState({ loading: false, error: 'Không thể xác định địa chỉ. Tọa độ đã chọn vẫn được giữ.' })
      }
    }

    const selectPosition = (position, { resolveAddress = true, pan = true } = {}) => {
      if (!mapRef.current || !markerRef.current) return
      const currentSelectedZoom = settingsRef.current.selectedZoom
      markerRef.current.position = position
      markerRef.current.map = mapRef.current
      if (pan) {
        mapRef.current.panTo(position)
        mapRef.current.setZoom(Math.max(mapRef.current.getZoom() ?? currentSelectedZoom, currentSelectedZoom))
      }
      callbacksRef.current.onChange?.(position.lat, position.lng)
      if (resolveAddress) void reverseGeocode(position)
    }
    selectPositionRef.current = selectPosition

    async function initialize() {
      try {
        const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
          loadMapsLibrary(),
          loadMarkerLibrary(),
        ])
        if (!active || !mapCanvasRef.current) return

        const settings = settingsRef.current
        const initialPosition = hasMapPosition(settings.value)
          ? { lat: settings.value.lat, lng: settings.value.lng }
          : null
        const map = new Map(mapCanvasRef.current, {
          center: initialPosition ?? settings.defaultCenter,
          zoom: initialPosition ? settings.selectedZoom : settings.defaultZoom,
          mapId: getGoogleMapsMapId(),
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: 'greedy',
        })
        const marker = new AdvancedMarkerElement({
          map: initialPosition ? map : null,
          position: initialPosition ?? undefined,
          gmpDraggable: !readOnly,
          title: readOnly ? 'Vị trí địa điểm' : 'Kéo để điều chỉnh vị trí',
        })
        mapRef.current = map
        markerRef.current = marker

        if (!readOnly) {
          listenersRef.current.push(map.addListener('click', (event) => {
            const position = toLatLngLiteral(event.latLng)
            if (position) selectPosition(position)
          }))
          listenersRef.current.push(marker.addListener('dragend', (event) => {
            const position = toLatLngLiteral(event.latLng ?? marker.position)
            if (position) selectPosition(position, { pan: false })
          }))
        }
        setMapReady(true)

        if (!readOnly && settings.showSearch && searchAreaRef.current) {
          try {
            const { PlaceAutocompleteElement } = await loadPlacesLibrary()
            if (!active || !searchAreaRef.current) return
            const autocomplete = new PlaceAutocompleteElement()
            autocomplete.includedRegionCodes = ['vn']
            autocomplete.locationBias = HUE_CENTER
            autocomplete.placeholder = 'Tìm địa điểm hoặc địa chỉ tại Huế'
            autocomplete.setAttribute('aria-label', 'Tìm địa điểm hoặc địa chỉ bằng Google Maps')
            const handlePlaceSelect = async ({ placePrediction }) => {
              try {
                const place = placePrediction.toPlace()
                await place.fetchFields({
                  fields: ['displayName', 'formattedAddress', 'location', 'addressComponents', 'viewport'],
                })
                if (!active) return
                const position = toLatLngLiteral(place.location)
                if (!position) throw new Error('Place has no location')
                geocodeRequestIdRef.current += 1
                selectPosition(position, { resolveAddress: false, pan: !place.viewport })
                publishAddressState({ loading: false, error: '' })
                callbacksRef.current.onAddressResolved?.(buildAddressSuggestion(place))
                if (place.viewport) map.fitBounds(place.viewport)
              } catch {
                if (active) setPlacesError('Không thể đọc địa điểm đã chọn. Bạn vẫn có thể chọn trực tiếp trên bản đồ.')
              }
            }
            const handlePlaceError = () => {
              if (active) setPlacesError('Tìm kiếm Google Maps tạm thời không khả dụng. Bạn vẫn có thể chọn trực tiếp trên bản đồ.')
            }
            autocomplete.addEventListener('gmp-select', handlePlaceSelect)
            autocomplete.addEventListener('gmp-error', handlePlaceError)
            searchAreaRef.current.appendChild(autocomplete)
            autocompleteRef.current = autocomplete
            autocompleteListenerRef.current = handlePlaceSelect
            autocompleteErrorListenerRef.current = handlePlaceError
          } catch {
            if (active) setPlacesError('Tìm kiếm Google Maps tạm thời không khả dụng. Bạn vẫn có thể chọn trực tiếp trên bản đồ.')
          }
        }
      } catch (error) {
        if (active) setMapError(error instanceof Error ? error.message : 'Không thể tải Google Maps.')
      }
    }

    void initialize()
    return () => {
      active = false
      unsubscribeAuthenticationFailure()
      clearGoogleObjects()
    }
  }, [readOnly, retryKey])

  useEffect(() => {
    const position = { lat: valueLat, lng: valueLng }
    if (!mapReady || !mapRef.current || !markerRef.current || !hasMapPosition(position)) return
    markerRef.current.position = position
    markerRef.current.map = mapRef.current
    mapRef.current.panTo(position)
  }, [mapReady, valueLat, valueLng])

  function useCurrentLocation() {
    setGeolocationError('')
    if (!navigator.geolocation) {
      setGeolocationError(geolocationMessage())
      return
    }
    setGeolocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setGeolocationLoading(false)
        const position = { lat: coords.latitude, lng: coords.longitude }
        selectPositionRef.current?.(position)
      },
      (error) => {
        setGeolocationLoading(false)
        setGeolocationError(`${geolocationMessage(error)} Bạn vẫn có thể tìm hoặc chọn trực tiếp trên bản đồ.`)
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    )
  }

  return (
    <div className={styles.mapShell}>
      {!readOnly && (showSearch || showCurrentLocation) ? (
        <div className={styles.mapToolbar}>
          {showSearch ? <div ref={searchAreaRef} className={styles.searchArea} /> : null}
          {showCurrentLocation ? (
            <Button
              className={styles.currentLocationButton}
              icon={<EnvironmentOutlined />}
              loading={geolocationLoading}
              disabled={!mapReady}
              onClick={useCurrentLocation}
            >
              Dùng vị trí hiện tại
            </Button>
          ) : null}
        </div>
      ) : null}
      {placesError ? <p className={styles.warning}>{placesError}</p> : null}
      {geolocationError ? <p className={styles.warning}>{geolocationError}</p> : null}
      <div className={styles.mapFrame}>
        <div ref={mapCanvasRef} className={styles.mapCanvas} aria-label="Bản đồ chọn vị trí" />
        {!mapReady && !mapError ? <div className={styles.mapLoading}>Đang tải Google Maps...</div> : null}
        {mapError ? (
          <div className={styles.mapError} role="alert">
            <span>{mapError}</span>
            <Button size="small" onClick={() => {
              setMapReady(false)
              setMapError('')
              setPlacesError('')
              setRetryKey((key) => key + 1)
            }}>Thử lại</Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
