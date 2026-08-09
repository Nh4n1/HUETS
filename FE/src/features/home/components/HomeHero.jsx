import {
  ArrowRightOutlined,
  EnvironmentOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { Button, Input } from 'antd'
import heroImage from '../../../assets/home/hue-heritage-hero.png'
import styles from '../../../pages/HomePage.module.css'

const suggestions = [
  { label: 'Di sản', categoryCode: 'historical_site' },
  { label: 'Ẩm thực Huế', categoryCode: 'restaurant' },
  { label: 'Cà phê', categoryCode: 'cafe' },
]

export function HomeHero({ query, onQueryChange, onSearch, onCategorySelect }) {
  return (
    <section
      className={styles.hero}
      style={{ '--hero-image': `url(${heroImage})` }}
      aria-labelledby="home-heading"
    >
      <div className={styles.heroOverlay} />
      <div className={styles.heroContent}>
        <span className={styles.eyebrow}>Nền tảng du lịch cộng đồng tại Huế</span>
        <h1 id="home-heading">
          Chạm vào nhịp sống <em>rất Huế.</em>
        </h1>
        <p className={styles.heroLead}>
          Từ những dấu xưa trong Thành Nội đến một góc cà phê bên sông,
          HueTrip giúp bạn tìm thấy trải nghiệm hợp với riêng mình.
        </p>

        <form className={styles.searchBox} onSubmit={onSearch} role="search">
          <Input
            variant="borderless"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            prefix={<SearchOutlined />}
            placeholder="Bạn muốn khám phá điều gì ở Huế?"
            aria-label="Tìm nhanh địa điểm nổi bật"
          />
          <Button type="primary" htmlType="submit" icon={<ArrowRightOutlined />}>
            Khám phá
          </Button>
        </form>

        <div className={styles.suggestions}>
          <span>Thử tìm:</span>
          {suggestions.map((suggestion) => (
            <button
              type="button"
              key={suggestion.categoryCode}
              onClick={() => onCategorySelect(suggestion.categoryCode, true)}
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.heroCaption}>
        <span className={styles.captionIcon}><EnvironmentOutlined /></span>
        <span>
          <small>Gợi cảm hứng từ</small>
          Di sản Cố đô Huế
        </span>
      </div>
    </section>
  )
}
