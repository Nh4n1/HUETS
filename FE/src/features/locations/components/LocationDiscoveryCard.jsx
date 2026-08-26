import { ArrowRightOutlined, EnvironmentOutlined, StarFilled, TagOutlined } from '@ant-design/icons'
import { Link } from 'react-router'
import { getRatingLabel, getTagLabel } from '../locationPresentation'
import styles from './LocationDiscoveryCard.module.css'

export function LocationDiscoveryCard({ location }) {
  return (
    <article className={styles.card}>
      <Link className={styles.link} to={`/locations/${location.id}`}>
        <div className={styles.image}>
          <span className={styles.placeholder} aria-hidden="true"><EnvironmentOutlined /></span>
          {location.coverImageUrl ? (
            <img src={location.coverImageUrl} alt={`Không gian tại ${location.name}`} loading="lazy"
              onError={(event) => { event.currentTarget.style.display = 'none' }} />
          ) : null}
          <span className={styles.category}>{location.category?.name}</span>
          {location.voucherSummary?.hasClaimableVoucher ? (
            <span className={styles.voucherBadge}><TagOutlined aria-hidden="true" /><span>Có ưu đãi</span></span>
          ) : null}
        </div>
        <div className={styles.body}>
          <div className={styles.heading}>
            <h3>{location.name}</h3>
            <span className={styles.rating}><StarFilled /> {getRatingLabel(location)}</span>
          </div>
          <p className={styles.address}><EnvironmentOutlined /> {location.formattedAddress}</p>
          {location.tagCodes?.length ? (
            <div className={styles.tags}>
              {location.tagCodes.slice(0, 3).map((code) => <span key={code}>{getTagLabel(code)}</span>)}
            </div>
          ) : null}
          <span className={styles.action}>Xem địa điểm <ArrowRightOutlined /></span>
        </div>
      </Link>
    </article>
  )
}
