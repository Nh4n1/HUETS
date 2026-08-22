import { BookOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { Card, Typography } from 'antd'
import { Link } from 'react-router'
import styles from '../../pages/ProfilePage.module.css'

const PERSONAL_LINKS = [
  {
    to: '/saved',
    icon: <BookOutlined />,
    title: 'Nội dung đã lưu',
    description: 'Xem các địa điểm và lịch trình bạn đã bookmark.',
  },
  {
    to: '/locations/mine',
    icon: <EnvironmentOutlined />,
    title: 'Địa điểm tôi đã đóng góp',
    description: 'Theo dõi trạng thái kiểm duyệt các địa điểm bạn đã gửi.',
  },
]

export function ProfilePersonalLinks() {
  return (
    <Card className={styles.personalCard} bordered={false}>
      <div className={styles.personalHeader}>
        <Typography.Title level={3}>Khu vực cá nhân</Typography.Title>
        <p>Truy cập nhanh các nội dung thuộc tài khoản của bạn.</p>
      </div>

      {PERSONAL_LINKS.map((item) => (
        <Link to={item.to} className={styles.personalItem} key={item.to}>
          <span className={styles.personalIcon} aria-hidden="true">{item.icon}</span>
          <span className={styles.personalContent}>
            <strong>{item.title}</strong>
            <small>{item.description}</small>
          </span>
          <span className={styles.personalArrow} aria-hidden="true">→</span>
        </Link>
      ))}
    </Card>
  )
}
