import { CompassOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import styles from '../../../pages/HomePage.module.css'
import { LocationCard } from './LocationCard'
import { LocationSkeleton } from './LocationSkeleton'

export function FeaturedLocationsSection({
  locations,
  loadStatus,
  submittedQuery,
  onClearSearch,
  onShowAll,
  onRetry,
}) {
  return (
    <section className={styles.featuredSection} id="featured" aria-labelledby="featured-heading">
      <div className={styles.featuredHeading}>
        <div>
          <span className={styles.sectionEyebrow}>Được chia sẻ gần đây</span>
          <h2 id="featured-heading">
            {submittedQuery ? `Kết quả cho “${submittedQuery}”` : 'Điểm đến đáng ghé'}
          </h2>
        </div>
        {submittedQuery ? (
          <button className={styles.clearSearch} type="button" onClick={onClearSearch}>
            Xóa tìm kiếm
          </button>
        ) : null}
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
          <h3>Chưa tìm thấy trong danh sách mới nhất</h3>
          <p>Hãy thử một từ khóa khác hoặc xem tất cả chủ đề đang có.</p>
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
