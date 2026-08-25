import { ArrowRightOutlined } from '@ant-design/icons'
import { Link } from 'react-router'
import styles from '../../../pages/HomePage.module.css'

export function CommunitySection({ isAuthenticated }) {
  return (
    <section className={styles.communitySection}>
      <div>
        <span className={styles.sectionEyebrow}>Cộng đồng</span>
        <h2>Biết một nơi thú vị chưa có trên HueTrip?</h2>
        <p>Đóng góp địa điểm để giúp cộng đồng có thêm những gợi ý đáng tin cậy.</p>
      </div>
      <Link to={isAuthenticated ? '/locations/contribute' : '/login'}>
        Đóng góp địa điểm <ArrowRightOutlined />
      </Link>
    </section>
  )
}
