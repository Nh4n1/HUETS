import { PlusOutlined } from '@ant-design/icons'
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
      <Link to="/itineraries/new"><Button type="primary" size="large" icon={<PlusOutlined />}>Tạo lịch trình</Button></Link>
    </section>
  )
}
