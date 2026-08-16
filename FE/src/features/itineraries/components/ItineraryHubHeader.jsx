import { PlusOutlined, RobotOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { Link } from 'react-router'
import styles from '../pages/Itinerary.module.css'

export function ItineraryHubHeader() {
  return (
    <section className={styles.hero}>
      <div>
        <span className={styles.eyebrow}>Lịch trình</span>
        <h1>Khám phá Huế theo cách của bạn</h1>
        <p>Khám phá hành trình cộng đồng hoặc tự xây dựng chuyến đi riêng.</p>
      </div>
      <div className={styles.heroActions}>
        <Link to="/itineraries/new"><Button size="large" icon={<PlusOutlined />}>Tạo thủ công</Button></Link>
        <Link to="/itineraries/ai/new"><Button type="primary" size="large" icon={<RobotOutlined />}>✨ Gợi ý bằng AI</Button></Link>
      </div>
    </section>
  )
}
