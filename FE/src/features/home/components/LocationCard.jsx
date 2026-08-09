import { EnvironmentOutlined, StarFilled } from '@ant-design/icons'
import styles from '../../../pages/HomePage.module.css'

const tagLabels = {
  quiet: 'Yên tĩnh',
  lively: 'Sôi động',
  cozy: 'Ấm cúng',
  romantic: 'Lãng mạn',
  traditional_ambience: 'Không gian truyền thống',
  outdoor: 'Ngoài trời',
  riverside: 'Ven sông',
  scenic_view: 'Cảnh đẹp',
  family: 'Gia đình',
  children: 'Trẻ em',
  groups: 'Nhóm bạn',
  parking: 'Có chỗ đỗ xe',
  wifi: 'Wi-Fi',
  wheelchair_accessible: 'Hỗ trợ xe lăn',
  sightseeing: 'Tham quan',
  photography: 'Chụp ảnh',
  cultural_experience: 'Trải nghiệm văn hóa',
  local_food: 'Ẩm thực địa phương',
  vegetarian_options: 'Có món chay',
  free_entry: 'Miễn phí',
  budget: 'Tiết kiệm',
}

export function LocationCard({ location }) {
  const ratingLabel = location.reviewCount > 0
    ? `${Number(location.averageRating).toFixed(1)} (${location.reviewCount})`
    : 'Chưa có đánh giá'

  return (
    <article className={styles.locationCard}>
      <div className={styles.locationImage}>
        <div className={styles.imagePlaceholder} aria-hidden="true">
          <EnvironmentOutlined />
        </div>
        {location.coverImageUrl ? (
          <img
            src={location.coverImageUrl}
            alt={`Không gian tại ${location.name}`}
            loading="lazy"
            onError={(event) => { event.currentTarget.style.display = 'none' }}
          />
        ) : null}
        <span className={styles.categoryBadge}>{location.category.name}</span>
      </div>

      <div className={styles.locationBody}>
        <div className={styles.locationHeading}>
          <h3>{location.name}</h3>
          <span className={styles.rating}>
            <StarFilled /> {ratingLabel}
          </span>
        </div>
        <p className={styles.address}>
          <EnvironmentOutlined />
          <span>{location.formattedAddress}</span>
        </p>
        {location.tagCodes?.length ? (
          <div className={styles.tags} aria-label="Đặc điểm nổi bật">
            {location.tagCodes.slice(0, 3).map((tag) => (
              <span key={tag}>{tagLabels[tag] ?? tag.replaceAll('_', ' ')}</span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  )
}
