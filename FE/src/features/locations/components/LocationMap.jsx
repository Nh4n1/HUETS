import { AimOutlined, ExportOutlined } from '@ant-design/icons'
import { GoogleLocationMap } from '../../../shared/maps/GoogleLocationMap'
import {
  googleMapsDirectionsUrl,
  googleMapsSearchUrl,
} from '../../../shared/maps/googleMapUtils'
import styles from './LocationMap.module.css'

export function LocationMap({ latitude, longitude, label }) {
  return (
    <div className={styles.locationMap}>
      <div className={styles.mapCanvas}>
        <GoogleLocationMap latitude={latitude} longitude={longitude} label={label} />
      </div>
      <div className={styles.actions}>
        <a href={googleMapsDirectionsUrl(latitude, longitude)} target="_blank" rel="noreferrer">
          <AimOutlined /> Chỉ đường
        </a>
        <a href={googleMapsSearchUrl(latitude, longitude)} target="_blank" rel="noreferrer">
          <ExportOutlined /> Mở Google Maps
        </a>
      </div>
    </div>
  )
}
