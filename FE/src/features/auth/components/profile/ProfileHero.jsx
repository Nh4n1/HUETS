import { Typography } from 'antd'
import styles from '../../pages/ProfilePage.module.css'

export function ProfileHero() {
  return (
    <section className={styles.hero} aria-labelledby="profile-title">
      <div className={styles.heroContent}>
        <span className={styles.eyebrow}>Tài khoản HueTrip</span>
        <Typography.Title id="profile-title" level={1} className={styles.title}>
          Hồ sơ của tôi
        </Typography.Title>
        <p className={styles.lead}>
          Thông tin đang được sử dụng cho tài khoản và các hoạt động của bạn trên HueTrip.
        </p>
      </div>
    </section>
  )
}
