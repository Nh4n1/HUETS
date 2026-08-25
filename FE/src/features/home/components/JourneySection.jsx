import { ArrowRightOutlined } from '@ant-design/icons'
import { Link } from 'react-router'
import styles from '../../../pages/HomePage.module.css'

export function JourneySection({ isAuthenticated }) {
  return (
    <section className={styles.journeySection}>
      <div className={styles.journeyContent}>
        <span className={styles.sectionEyebrow}>Lên kế hoạch</span>
        <h2>Biến những địa điểm yêu thích thành một hành trình</h2>
        <p>Lưu địa điểm, sắp xếp theo ngày và xây dựng lịch trình cho chuyến đi Huế của bạn.</p>
      </div>
      <Link className={styles.journeyCta} to={isAuthenticated ? '/itineraries/mine' : '/itineraries'}>
        Khám phá lịch trình <ArrowRightOutlined />
      </Link>
    </section>
  )
}
