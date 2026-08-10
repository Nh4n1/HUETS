import { ArrowRightOutlined } from '@ant-design/icons'
import { Link } from 'react-router'
import styles from '../../../pages/HomePage.module.css'

export function CommunitySection({ isAuthenticated }) {
  return (
    <section className={styles.communitySection}>
      <span className={styles.sectionEyebrow}>Cùng nhau kể chuyện Huế</span>
      <h2>Điều tuyệt vời thường bắt đầu từ một chia sẻ nhỏ.</h2>
      <p>
        Tham gia HueTrip để lưu lại hành trình và góp phần làm giàu bản đồ
        trải nghiệm địa phương bằng những khám phá của bạn.
      </p>
      <Link to={isAuthenticated ? '/profile' : '/register'}>
        {isAuthenticated ? 'Đi đến hồ sơ' : 'Tham gia cộng đồng'} <ArrowRightOutlined />
      </Link>
      
    </section>
  )
}
