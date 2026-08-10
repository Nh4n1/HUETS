import {
  CheckCircleOutlined,
  IdcardOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Avatar, Card, Tag, Typography } from 'antd'
import { useAuth } from '../context/useAuth'
import styles from './ProfilePage.module.css'

const ROLE_LABELS = {
  user: 'Thành viên',
  admin: 'Quản trị viên',
}

const STATUS_LABELS = {
  active: 'Đang hoạt động',
  locked: 'Đã khóa',
}

export function ProfilePage() {
  const { user } = useAuth()

  if (!user) return null

  const roleLabel = ROLE_LABELS[user.role] ?? user.role
  const statusLabel = STATUS_LABELS[user.status] ?? user.status
  const isActive = user.status === 'active'
  const hasBio = Boolean(user.bio?.trim())

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="profile-title">
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>Tài khoản HueTrip</span>

          <Typography.Title
            id="profile-title"
            level={1}
            className={styles.title}
          >
            Hồ sơ của tôi
          </Typography.Title>

          <p className={styles.lead}>
            Thông tin đang được sử dụng cho tài khoản và các hoạt động của bạn
            trên HueTrip.
          </p>
        </div>
      </section>

      <div className={styles.content}>
        <Card className={styles.identityCard} bordered={false}>
          <div className={styles.identity}>
            <Avatar
              className={styles.avatar}
              size={104}
              src={user.avatarUrl}
              icon={<UserOutlined />}
              alt={`Ảnh đại diện của ${user.displayName}`}
            />

            <div className={styles.identityText}>
              <Typography.Title level={2} className={styles.displayName}>
                {user.displayName}
              </Typography.Title>

              <div className={styles.emailLine}>
                <MailOutlined aria-hidden="true" />
                <span>{user.email}</span>
              </div>

              <div className={styles.badges} aria-label="Thông tin tài khoản">
                <Tag
                  className={styles.roleTag}
                  icon={<SafetyCertificateOutlined />}
                >
                  {roleLabel}
                </Tag>

                <Tag
                  className={isActive ? styles.activeTag : styles.lockedTag}
                  icon={<CheckCircleOutlined />}
                >
                  {statusLabel}
                </Tag>
              </div>
            </div>
          </div>
        </Card>

        <div className={styles.detailsGrid}>
          <Card className={styles.detailCard} bordered={false}>
            <div className={styles.cardHeading}>
              <span className={styles.headingIcon} aria-hidden="true">
                <UserOutlined />
              </span>

              <div>
                <Typography.Title level={3}>
                  Giới thiệu
                </Typography.Title>

                <p>
                  Thông tin ngắn hiển thị trong hồ sơ của bạn.
                </p>
              </div>
            </div>

            {hasBio ? (
              <p className={styles.bio}>{user.bio}</p>
            ) : (
              <div className={styles.emptyBio}>
                Chưa có phần giới thiệu.
              </div>
            )}
          </Card>

          <Card className={styles.detailCard} bordered={false}>
            <div className={styles.cardHeading}>
              <span className={styles.headingIcon} aria-hidden="true">
                <IdcardOutlined />
              </span>

              <div>
                <Typography.Title level={3}>
                  Thông tin tài khoản
                </Typography.Title>

                <p>
                  Các thông tin cơ bản gắn với tài khoản HueTrip.
                </p>
              </div>
            </div>

            <dl className={styles.accountList}>
              <div className={styles.accountRow}>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>

              <div className={styles.accountRow}>
                <dt>Vai trò</dt>
                <dd>{roleLabel}</dd>
              </div>

              <div className={styles.accountRow}>
                <dt>Trạng thái</dt>

                <dd
                  className={
                    isActive
                      ? styles.statusActive
                      : styles.statusLocked
                  }
                >
                  <span
                    className={styles.statusDot}
                    aria-hidden="true"
                  />

                  {statusLabel}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </main>
  )
}