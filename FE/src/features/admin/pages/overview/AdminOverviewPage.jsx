import { EnvironmentOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Typography } from 'antd'
import { Link } from 'react-router'
import styles from '../AdminPage.module.css'

export function AdminOverviewPage() {
  return (
    <main className={`${styles.page} page-container`}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>HueTrip Admin</span>
          <Typography.Title level={2}>Tổng quan</Typography.Title>
          <p>Quản lý nội dung và bắt đầu các tác vụ thường dùng từ một nơi.</p>
        </div>
      </header>

      <section className={styles.quickGrid} aria-label="Thao tác nhanh">
        <Card className={styles.quickCard}>
          <div className={styles.quickContent}>
            <span className={styles.quickIcon}><EnvironmentOutlined /></span>
            <Typography.Text strong>Địa điểm</Typography.Text>
            <p>Xem, tìm kiếm và kiểm duyệt toàn bộ địa điểm trên hệ thống.</p>
            <Link to="/admin/locations">
              <Button>Xem tất cả địa điểm</Button>
            </Link>
          </div>
        </Card>

        <Card className={styles.quickCard}>
          <div className={styles.quickContent}>
            <span className={styles.quickIcon}><PlusOutlined /></span>
            <Typography.Text strong>Thêm mới</Typography.Text>
            <p>Tạo một địa điểm hoàn chỉnh và xuất bản từ khu vực quản trị.</p>
            <Link to="/admin/locations/new">
              <Button type="primary">Thêm địa điểm mới</Button>
            </Link>
          </div>
        </Card>
      </section>
    </main>
  )
}
