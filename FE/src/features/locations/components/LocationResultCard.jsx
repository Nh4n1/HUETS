import { ArrowRightOutlined, EnvironmentOutlined, StarFilled } from '@ant-design/icons'
import { Link } from 'react-router'
import { BookmarkButton } from '../../bookmarks/components/BookmarkButton'
import { createLocationBookmark } from '../../bookmarks/utils/bookmarkMappers'
import { getRatingLabel, getTagLabel } from '../locationPresentation'
import styles from './LocationResultCard.module.css'

export function LocationResultCard({ location }) {
  return (
    <article className={styles.card}>
      <Link
        className={styles.imageLink}
        to={`/locations/${location.id}`}
        aria-label={`Xem chi tiết ${location.name}`}
      >
        <span className={styles.imagePlaceholder} aria-hidden="true">
          <EnvironmentOutlined />
        </span>
        {location.coverImageUrl ? (
          <img
            src={location.coverImageUrl}
            alt={`Không gian tại ${location.name}`}
            loading="lazy"
            onError={(event) => { event.currentTarget.style.display = 'none' }}
          />
        ) : null}

      </Link>

      <div className={styles.body}>
        <div className={styles.heading}>
          <div>
            <span className={styles.category}>{location.category.name}</span>
            <h3><Link to={`/locations/${location.id}`}>{location.name}</Link></h3>
          </div>
          <BookmarkButton bookmark={createLocationBookmark(location)} className={styles.bookmarkButton} />
        </div>

        <span className={styles.rating}><StarFilled /> {getRatingLabel(location)}</span>

        <p className={styles.address}>
          <EnvironmentOutlined />
          <span>{location.formattedAddress}</span>
        </p>

        {location.tagCodes?.length ? (
          <div className={styles.tags} aria-label="Đặc điểm nổi bật">
            {location.tagCodes.slice(0, 4).map((tag) => (
              <span key={tag}>{getTagLabel(tag)}</span>
            ))}
          </div>
        ) : null}

        <div className={styles.actions}>
          <Link className={styles.detailLink} to={`/locations/${location.id}`}>
            Xem chi tiết <ArrowRightOutlined />
          </Link>
        </div>
      </div>
    </article>
  )
}
