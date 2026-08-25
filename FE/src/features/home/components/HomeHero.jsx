import { ArrowRightOutlined, EnvironmentOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Input } from 'antd'
import styles from '../../../pages/HomePage.module.css'

const suggestions = ['Quán cà phê yên tĩnh có Wi-Fi', 'Đặc sản Huế cho gia đình', 'Nơi ngắm hoàng hôn']

export function HomeHero({ query, onQueryChange, onSearch, onSuggestion }) {
  return (
    <section className={styles.hero} aria-labelledby="home-heading">
      <div className={styles.heroOverlay} />
      <div className={styles.heroContent}>
        <span className={styles.eyebrow}>Khám phá Huế cùng cộng đồng</span>
        <h1 id="home-heading">Khám phá Huế theo cách của bạn</h1>
        <p className={styles.heroLead}>Từ di sản, ẩm thực đến những góc cà phê và trải nghiệm địa phương, HueTrip giúp bạn tìm nơi phù hợp với hành trình của mình.</p>
        <form className={styles.searchBox} onSubmit={onSearch} role="search">
          <Input variant="borderless" value={query} onChange={(event) => onQueryChange(event.target.value)}
            prefix={<SearchOutlined />} placeholder="Bạn muốn tìm gì ở Huế?" aria-label="Tìm địa điểm tại Huế" />
          <Button type="primary" htmlType="submit" icon={<ArrowRightOutlined />}>Tìm địa điểm</Button>
        </form>
        <div className={styles.suggestions}>
          <span>Thử tìm:</span>
          {suggestions.map((suggestion) => (
            <button type="button" key={suggestion} onClick={() => onSuggestion(suggestion)}>{suggestion}</button>
          ))}
        </div>
      </div>
      <div className={styles.heroCaption}>
        <span className={styles.captionIcon}><EnvironmentOutlined /></span>
        <span><small>Gợi cảm hứng từ</small>Di sản Cố đô Huế</span>
      </div>
    </section>
  )
}
