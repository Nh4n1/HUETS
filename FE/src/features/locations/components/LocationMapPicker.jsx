import L from 'leaflet'
import { EnvironmentOutlined, SearchOutlined } from '@ant-design/icons'
import { Alert, Button, Input, Spin, Typography } from 'antd'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { searchGeocodingPlacesApi } from '../api/locationApi'
import styles from './LocationMapPicker.module.css'

// Use a standalone icon so Leaflet's Icon.Default does not prefix Vite's
// inlined data URLs with its auto-detected image path.
const locationMarkerIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
})

const HUE_CENTER = [16.4637, 107.5909]
const DEFAULT_ZOOM = 15
const SELECTED_POSITION_ZOOM = 17
const MAX_ZOOM = 19

function ClickHandler({ onChange }) {
  const map = useMapEvents({
    click(event) {
      onChange(event.latlng.lat, event.latlng.lng)
      map.setView(event.latlng, Math.max(map.getZoom(), SELECTED_POSITION_ZOOM))
    },
  })
  return null
}

function MapViewport({ value }) {
  const map = useMap()

  useEffect(() => {
    if (typeof value?.lat !== 'number' || typeof value?.lng !== 'number') return
    map.flyTo([value.lat, value.lng], Math.max(map.getZoom(), SELECTED_POSITION_ZOOM), {
      duration: 0.65,
    })
  }, [map, value?.lat, value?.lng])

  return null
}

export function LocationMapPicker({ value, onChange, onPlaceSelect, readOnly = false }) {
  const hasPosition = typeof value?.lat === 'number' && typeof value?.lng === 'number'
  const center = hasPosition ? [value.lat, value.lng] : HUE_CENTER
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [searchError, setSearchError] = useState('')
  const activeRequestRef = useRef(null)

  useEffect(() => () => {
    activeRequestRef.current?.abort()
    activeRequestRef.current = null
  }, [])

  async function handleSearch(rawQuery) {
    const query = rawQuery.trim()
    activeRequestRef.current?.abort()
    activeRequestRef.current = null
    if (query.length < 2) {
      setSearching(false)
      setSearchResults([])
      setSearchError('Nhập ít nhất 2 ký tự để tìm địa điểm.')
      return
    }

    const controller = new AbortController()
    activeRequestRef.current = controller
    setSearching(true)
    setSearchError('')

    try {
      const results = await searchGeocodingPlacesApi(query, { signal: controller.signal })
      setSearchResults(results)
      if (results.length === 0) setSearchError('Không tìm thấy địa điểm phù hợp.')
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') {
        setSearchResults([])
        setSearchError(error.response?.data?.message ?? 'Không thể tìm kiếm địa điểm lúc này.')
      }
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null
        setSearching(false)
      }
    }
  }

  function handlePlaceSelection(place) {
    setSearchQuery(place.name)
    setSearchResults([])
    setSearchError('')
    onChange(place.latitude, place.longitude)
    onPlaceSelect?.(place)
  }

  function handleQueryChange(event) {
    const nextQuery = event.target.value
    setSearchQuery(nextQuery)
    if (nextQuery.trim()) return
    activeRequestRef.current?.abort()
    activeRequestRef.current = null
    setSearching(false)
    setSearchResults([])
    setSearchError('')
  }

  return (
    <div className={styles.picker}>
      {readOnly ? null : (
        <div className={styles.searchPanel}>
          <Input.Search
            allowClear
            enterButton={<><SearchOutlined /> Tìm kiếm</>}
            loading={searching}
            placeholder="Nhập tên địa điểm hoặc địa chỉ tại Huế"
            value={searchQuery}
            onChange={handleQueryChange}
            onSearch={handleSearch}
          />
          {searching ? <div className={styles.searchState}><Spin size="small" /> Đang tìm địa điểm...</div> : null}
          {searchError ? <Alert type="info" showIcon message={searchError} /> : null}
          {searchResults.length > 0 ? (
            <div className={styles.results} role="list" aria-label="Kết quả tìm kiếm địa điểm">
              {searchResults.map((place) => (
                <Button
                  className={styles.resultButton}
                  key={place.id}
                  type="text"
                  icon={<EnvironmentOutlined />}
                  onClick={() => handlePlaceSelection(place)}
                >
                  <span>
                    <strong>{place.name}</strong>
                    <Typography.Text type="secondary">{place.displayName}</Typography.Text>
                  </span>
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      )}
      <MapContainer
        className={styles.map}
        center={center}
        zoom={hasPosition ? SELECTED_POSITION_ZOOM : DEFAULT_ZOOM}
        maxZoom={MAX_ZOOM}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={MAX_ZOOM}
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewport value={value} />
        {readOnly ? null : <ClickHandler onChange={onChange} />}
        {hasPosition ? (
          <Marker
            draggable={!readOnly}
            icon={locationMarkerIcon}
            position={[value.lat, value.lng]}
            eventHandlers={readOnly ? undefined : {
              dragend(event) {
                const position = event.target.getLatLng()
                onChange(position.lat, position.lng)
              },
            }}
          />
        ) : null}
      </MapContainer>
      {readOnly ? null : (
        <Typography.Text className={styles.hint} type="secondary">
          Chọn kết quả tìm kiếm, nhấp trên bản đồ hoặc kéo marker để chỉnh vị trí chính xác.
        </Typography.Text>
      )}
    </div>
  )
}
