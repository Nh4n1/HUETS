import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
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

export function LocationMapPicker({ value, onChange, readOnly = false }) {
  const hasPosition = typeof value?.lat === 'number' && typeof value?.lng === 'number'
  const center = hasPosition ? [value.lat, value.lng] : HUE_CENTER

  return (
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
      {readOnly ? null : <ClickHandler onChange={onChange} />}
      {hasPosition ? (
        <Marker icon={locationMarkerIcon} position={[value.lat, value.lng]} />
      ) : null}
    </MapContainer>
  )
}
