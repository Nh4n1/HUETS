import { ArrowRightOutlined, CompassOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import styles from '../../../pages/HomePage.module.css'
import { LocationCard } from './LocationCard'
import { LocationSkeleton } from './LocationSkeleton'

export function FeaturedLocationsSection({
  locations,
  loadStatus,
  onShowAll,
  onRetry,
}) {
  return (
    <section className={styles.featuredSection} id="featured" aria-labelledby="featured-heading">
      <div className={styles.featuredHeading}>
        <div>
          <span className={styles.sectionEyebrow}>Được chia sẻ gần đây</span>
          <h2 id="featured-heading">Điểm đến đáng ghé</h2>
        </div>
        <Button
          type="text"
          className={styles.showAllButton}
          onClick={onShowAll}
        >
          Khám phá tất cả <ArrowRightOutlined />
        </Button>
      </div>

      {loadStatus === 'loading' ? (
        <div className={styles.locationGrid} aria-label="Đang tải địa điểm">
          {[0, 1, 2, 3].map((item) => <LocationSkeleton key={item} />)}
        </div>
      ) : null}

      {loadStatus === 'success' && locations.length > 0 ? (
        <div className={styles.locationGrid}>
          {locations.slice(0, 4).map((location) => (
            <LocationCard key={location.id} location={location} />
          ))}
        </div>
      ) : null}

      {loadStatus === 'success' && locations.length === 0 ? (
        <div className={styles.emptyState}>
          <CompassOutlined />
          <h3>Chưa có địa điểm trong chủ đề này</h3>
          <p>Hãy xem toàn bộ danh sách để khám phá những địa điểm khác.</p>
          <Button onClick={onShowAll}>Xem tất cả</Button>
        </div>
      ) : null}

      {loadStatus === 'error' ? (
        <div className={styles.emptyState}>
          <CompassOutlined />
          <h3>Dữ liệu địa điểm đang được cập nhật</h3>
          <p>Bạn có thể tải lại để tiếp tục khám phá những chia sẻ mới.</p>
          <Button onClick={onRetry}>Tải lại</Button>
        </div>
      ) : null}
    </section>
  )
}
