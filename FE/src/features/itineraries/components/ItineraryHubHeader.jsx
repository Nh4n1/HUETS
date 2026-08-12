import { PlusOutlined, RobotOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'
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
        <Tooltip title="Tính năng gợi ý lịch trình bằng AI sẽ được mở ở giai đoạn tiếp theo.">
          <span><Button type="primary" size="large" icon={<RobotOutlined />} disabled>Gợi ý bằng AI</Button></span>
        </Tooltip>
      </div>
    </section>
  )
}
