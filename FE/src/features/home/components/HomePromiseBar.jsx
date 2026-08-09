import {
  CalendarOutlined,
  CompassOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import styles from '../../../pages/HomePage.module.css'

export function HomePromiseBar() {
  return (
    <section className={styles.promiseBar} aria-label="Giá trị của HueTrip">
      <div>
        <TeamOutlined />
        <span><strong>Từ cộng đồng</strong><small>Góc nhìn chân thật</small></span>
      </div>
      <div>
        <CompassOutlined />
        <span><strong>Đúng gu của bạn</strong><small>Khám phá linh hoạt</small></span>
      </div>
      <div>
        <CalendarOutlined />
        <span><strong>Dễ dàng lên lịch</strong><small>Chủ động từng hành trình</small></span>
      </div>
    </section>
  )
}
