import { ArrowLeftOutlined, CompassOutlined, RobotOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { Link } from 'react-router'
import styles from './Itinerary.module.css'

export function ItineraryCreateChoicePage() {
  return (
    <main className={`${styles.page} ${styles.choicePage}`}>
      <Link to="/itineraries/mine"><Button type="text" icon={<ArrowLeftOutlined />}>Quay lại</Button></Link>
      <section className={styles.choicePanel}>
        <span className={styles.eyebrow}>Tạo lịch trình</span>
        <h1>Bạn muốn bắt đầu như thế nào?</h1>
        <p>Cả hai cách đều cho phép bạn xem lại và chỉnh sửa trước khi lưu.</p>
        <div className={styles.choiceGrid}>
          <Link className={styles.choiceCard} to="/itineraries/new/manual">
            <CompassOutlined />
            <strong>Tự chọn địa điểm</strong>
            <span>Bạn chọn những nơi muốn đi, HueTrip hỗ trợ sắp xếp.</span>
          </Link>
          <Link className={styles.choiceCard} to="/itineraries/new/ai">
            <RobotOutlined />
            <strong>AI gợi ý</strong>
            <span>HueTrip tạo bản nháp từ sở thích của bạn và dữ liệu địa điểm thật.</span>
          </Link>
        </div>
      </section>
    </main>
  )
}
