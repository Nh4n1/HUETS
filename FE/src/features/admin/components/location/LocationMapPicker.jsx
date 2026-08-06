import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'

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
const DEFAULT_ZOOM = 13

function ClickHandler({ onChange }) {
  useMapEvents({
    click(event) {
      onChange(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

export function LocationMapPicker({ value, onChange, readOnly = false }) {
  const hasPosition = typeof value?.lat === 'number' && typeof value?.lng === 'number'
  const center = hasPosition ? [value.lat, value.lng] : HUE_CENTER

  return (
    <MapContainer
      center={center}
      zoom={DEFAULT_ZOOM}
      style={{ height: 320, width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {readOnly ? null : <ClickHandler onChange={onChange} />}
      {hasPosition ? (
        <Marker icon={locationMarkerIcon} position={[value.lat, value.lng]} />
      ) : null}
    </MapContainer>
  )
}
