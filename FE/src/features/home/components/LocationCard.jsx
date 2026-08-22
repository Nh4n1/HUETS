import {
  ArrowRightOutlined,
  EnvironmentOutlined,
  StarFilled,
} from '@ant-design/icons'
import { Link } from 'react-router'
import {
  getRatingLabel,
  getTagLabel,
} from '../../locations/locationPresentation'
import styles from '../../../pages/HomePage.module.css'

export function LocationCard({ location }) {
  return (
    <article className={styles.locationCard}>
      <Link
        className={styles.locationCardLink}
        to={`/locations/${location.id}`}
        aria-label={`Xem chi tiết ${location.name}`}
      >
        <div className={styles.locationImage}>
          <div
            className={styles.imagePlaceholder}
            aria-hidden="true"
          >
            <EnvironmentOutlined />
          </div>

          {location.coverImageUrl ? (
            <img
              src={location.coverImageUrl}
              alt={`Không gian tại ${location.name}`}
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display =
                  'none'
              }}
            />
          ) : null}

          <span className={styles.categoryBadge}>
            {location.category.name}
          </span>
        </div>

        <div className={styles.locationBody}>
          <div className={styles.locationHeading}>
            <h3>
              {location.name}
            </h3>

            <span className={styles.rating}>
              <StarFilled />

              {getRatingLabel(location)}
            </span>
          </div>

          <p className={styles.address}>
            <EnvironmentOutlined />

            <span>
              {location.formattedAddress}
            </span>
          </p>

          {location.tagCodes?.length ? (
            <div
              className={styles.tags}
              aria-label="Đặc điểm nổi bật"
            >
              {location.tagCodes
                .slice(0, 3)
                .map((tag) => (
                  <span key={tag}>
                    {getTagLabel(tag)}
                  </span>
                ))}
            </div>
          ) : null}

          <span className={styles.cardAction} aria-hidden="true">
            Xem địa điểm <ArrowRightOutlined />
          </span>
        </div>
      </Link>

    </article>
  )
}
