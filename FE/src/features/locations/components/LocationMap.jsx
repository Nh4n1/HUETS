import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'

const locationMarkerIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
})

export function LocationMap({ latitude, longitude, label }) {
  const position = [latitude, longitude]

  return (
    <MapContainer
      center={position}
      zoom={16}
      maxZoom={19}
      scrollWheelZoom={false}
      className="public-location-map"
      aria-label={`Bản đồ vị trí ${label}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker icon={locationMarkerIcon} position={position} />
    </MapContainer>
  )
}
