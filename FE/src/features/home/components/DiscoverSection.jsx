import {
  BankOutlined,
  CameraOutlined,
  CoffeeOutlined,
  CompassOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import styles from '../../../pages/HomePage.module.css'

const categories = [
  { code: '', name: 'Tất cả', icon: <CompassOutlined /> },
  { code: 'historical_site', name: 'Di sản', icon: <BankOutlined /> },
  { code: 'restaurant', name: 'Ẩm thực', icon: <ShopOutlined /> },
  { code: 'cafe', name: 'Cà phê', icon: <CoffeeOutlined /> },
  { code: 'natural_attraction', name: 'Thiên nhiên', icon: <CameraOutlined /> },
  { code: 'market_shopping', name: 'Chợ địa phương', icon: <ShopOutlined /> },
]

export function DiscoverSection({ activeCategory, onCategorySelect }) {
  return (
    <section className={styles.discoverSection} id="discover">
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.sectionEyebrow}>Bắt đầu từ điều bạn yêu thích</span>
          <h2>Mỗi góc Huế, một câu chuyện</h2>
        </div>
        <p>
          Chọn một chủ đề để xem những địa điểm mới nhất được cộng đồng
          HueTrip chia sẻ.
        </p>
      </div>

      <div className={styles.categoryList} aria-label="Lọc địa điểm theo chủ đề">
        {categories.map((category) => (
          <button
            type="button"
            key={category.code || 'all'}
            className={activeCategory === category.code ? styles.activeCategory : ''}
            aria-pressed={activeCategory === category.code}
            onClick={() => onCategorySelect(category.code)}
          >
            {category.icon}
            <span>{category.name}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
