import { IdcardOutlined, UserOutlined } from '@ant-design/icons'
import { Card, Typography } from 'antd'
import styles from '../../pages/ProfilePage.module.css'

export function ProfileDetails({ profile, roleLabel, statusLabel, isActive }) {
  const hasBio = Boolean(profile.bio?.trim())

  return (
    <div className={styles.detailsGrid}>
      <Card className={styles.detailCard} bordered={false}>
        <div className={styles.cardHeading}>
          <span className={styles.headingIcon} aria-hidden="true"><UserOutlined /></span>
          <div>
            <Typography.Title level={3}>Giới thiệu</Typography.Title>
            <p>Thông tin ngắn hiển thị trong hồ sơ của bạn.</p>
          </div>
        </div>
        {hasBio ? (
          <p className={styles.bio}>{profile.bio}</p>
        ) : (
          <div className={styles.emptyBio}>Chưa có phần giới thiệu.</div>
        )}
      </Card>

      <Card className={styles.detailCard} bordered={false}>
        <div className={styles.cardHeading}>
          <span className={styles.headingIcon} aria-hidden="true"><IdcardOutlined /></span>
          <div>
            <Typography.Title level={3}>Thông tin tài khoản</Typography.Title>
            <p>Các thông tin cơ bản gắn với tài khoản HueTrip.</p>
          </div>
        </div>
        <dl className={styles.accountList}>
          <div className={styles.accountRow}><dt>Email</dt><dd>{profile.email}</dd></div>
          <div className={styles.accountRow}><dt>Vai trò</dt><dd>{roleLabel}</dd></div>
          <div className={styles.accountRow}>
            <dt>Trạng thái</dt>
            <dd className={isActive ? styles.statusActive : styles.statusLocked}>
              <span className={styles.statusDot} aria-hidden="true" />
              {statusLabel}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
