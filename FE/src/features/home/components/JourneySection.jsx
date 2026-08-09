import { ArrowRightOutlined } from '@ant-design/icons'
import { Link } from 'react-router'
import styles from '../../../pages/HomePage.module.css'

export function JourneySection({ isAuthenticated }) {
  return (
    <section className={styles.journeySection} id="plan">
      <div className={styles.journeyVisual} aria-hidden="true">
        <span className={styles.journeyDay}>01</span>
        <div className={styles.routeLine}>
          <i /><i /><i />
        </div>
        <div className={styles.journeyStop}>
          <small>08:00</small><strong>Đại Nội Huế</strong><span>Khởi đầu ngày mới</span>
        </div>
        <div className={styles.journeyStop}>
          <small>11:30</small><strong>Ẩm thực bản địa</strong><span>Dừng chân thưởng thức</span>
        </div>
        <div className={styles.journeyStop}>
          <small>16:45</small><strong>Bên dòng Hương</strong><span>Ngắm chiều chậm trôi</span>
        </div>
      </div>

      <div className={styles.journeyContent}>
        <span className={styles.sectionEyebrow}>Hành trình của riêng bạn</span>
        <h2>Để mỗi ngày ở Huế vừa vặn với điều bạn mong muốn.</h2>
        <p>
          Lưu lại những điểm đến yêu thích và từng bước xây dựng một lịch
          trình linh hoạt — bạn luôn là người quyết định cuối cùng.
        </p>
        <ul>
          <li><span>01</span> Chọn thời gian và sở thích</li>
          <li><span>02</span> Nhận bản nháp gợi ý</li>
          <li><span>03</span> Điều chỉnh trước khi lưu</li>
        </ul>
        <Link className={styles.journeyCta} to={isAuthenticated ? '/profile' : '/register'}>
          {isAuthenticated ? 'Xem không gian của tôi' : 'Tạo tài khoản miễn phí'}
          <ArrowRightOutlined />
        </Link>
      </div>
    </section>
  )
}
