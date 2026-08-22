import {
  ArrowRightOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  LockOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  StarOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Alert, Button, Card, Empty, List, Skeleton, Statistic, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../../auth/context/useAuth'
import { getAdminDashboardApi } from '../../api/adminDashboardApi'
import { formatDateTime } from '../../components/location/locationPresentation'
import styles from './AdminOverviewPage.module.css'

const errorText = (error) =>
  error.response?.data?.message ?? 'Không thể tải dữ liệu tổng quan. Vui lòng thử lại.'

function waitingTime(value, referenceValue) {
  const hours = Math.max(
    0,
    Math.floor((new Date(referenceValue).getTime() - new Date(value).getTime()) / 3_600_000),
  )
  if (hours < 24) return `${hours} giờ`
  return `${Math.floor(hours / 24)} ngày`
}

function MetricCard({ icon, title, value, detail, to, action, tone = 'primary' }) {
  return (
    <Link className={styles.metricLink} to={to} aria-label={`${title}: ${value}. ${action}`}>
      <Card className={styles.metricCard}>
        <div className={styles.metricTop}>
          <div className={`${styles.metricIcon} ${styles[tone]}`}>{icon}</div>
          <ArrowRightOutlined className={styles.metricArrow} />
        </div>
        <Statistic title={title} value={value} />
        <p>{detail}</p>
        <span className={styles.cardLink}>{action}</span>
      </Card>
    </Link>
  )
}

function UserMetric({ label, value, icon }) {
  return (
    <div className={styles.userMetric}>
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  )
}

export function AdminOverviewPage() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    getAdminDashboardApi()
      .then((data) => {
        if (!active) return
        setDashboard(data)
        setErrorMessage('')
      })
      .catch((error) => {
        if (active) setErrorMessage(errorText(error))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [reloadKey])

  const reload = () => setReloadKey((value) => value + 1)
  const isAdmin = user?.role === 'admin'

  return (
    <main className={`${styles.page} page-container`}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>HueTrip Admin</span>
          <Typography.Title level={2}>
            {isAdmin ? 'Tổng quan hệ thống' : 'Không gian kiểm duyệt'}
          </Typography.Title>
          <p>
            {isAdmin
              ? 'Theo dõi nội dung, người dùng và các công việc vận hành quan trọng.'
              : 'Ưu tiên các nội dung đang chờ và tiếp tục công việc kiểm duyệt.'}
          </p>
        </div>
        <div className={styles.refreshArea}>
          {dashboard?.generatedAt ? (
            <span>Cập nhật {formatDateTime(dashboard.generatedAt)}</span>
          ) : null}
          <Button icon={<ReloadOutlined />} loading={loading} onClick={reload}>
            Làm mới
          </Button>
        </div>
      </header>

      {errorMessage ? (
        <Alert
          showIcon
          type="error"
          message={errorMessage}
          action={<Button size="small" onClick={reload}>Thử lại</Button>}
        />
      ) : null}

      {!dashboard && loading ? (
        <Card><Skeleton active paragraph={{ rows: 8 }} /></Card>
      ) : null}

      {dashboard ? (
        <>
          <section aria-labelledby="pending-heading">
            <Card
              className={styles.pendingCard}
              title={(
                <div className={styles.cardTitle}>
                  <div>
                    <strong id="pending-heading">Hàng chờ kiểm duyệt</strong>
                    <span>Ưu tiên các địa điểm đã chờ lâu nhất</span>
                  </div>
                </div>
              )}
              extra={(
                <div className={styles.pendingHeaderActions}>
                  {dashboard.locations.overduePending > 0 ? (
                    <Tag color="error">{dashboard.locations.overduePending} quá hạn</Tag>
                  ) : (
                    <Tag color="success">Không có mục quá hạn</Tag>
                  )}
                  <Link to="/admin/locations/pending">Xem tất cả</Link>
                </div>
              )}
            >
              {dashboard.locations.oldestPending.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Hàng chờ hiện đang trống"
                />
              ) : (
                <List
                  dataSource={dashboard.locations.oldestPending}
                  renderItem={(location) => {
                    const overdue = new Date(dashboard.generatedAt).getTime()
                      - new Date(location.submittedAt).getTime()
                      >= dashboard.locations.overdueThresholdHours * 3_600_000
                    return (
                      <List.Item
                        actions={[
                          <Link key="review" className={styles.reviewLink} to={`/admin/locations/${location.id}`}>
                            Kiểm tra <ArrowRightOutlined />
                          </Link>,
                        ]}
                      >
                        <List.Item.Meta
                          title={<Link to={`/admin/locations/${location.id}`}>{location.name}</Link>}
                          description={`${location.wardName} · ${location.categoryName}`}
                        />
                        <div className={styles.waitingTime}>
                          <Tag color={overdue ? 'error' : 'gold'}>
                            Chờ {waitingTime(location.submittedAt, dashboard.generatedAt)}
                          </Tag>
                          <small>Gửi {formatDateTime(location.submittedAt)}</small>
                        </div>
                      </List.Item>
                    )
                  }}
                />
              )}
            </Card>
          </section>

          <section aria-labelledby="content-health-heading">
            <div className={styles.sectionHeading}>
              <div>
                <Typography.Title id="content-health-heading" level={4}>Tình trạng nội dung</Typography.Title>
                <p>Chọn một chỉ số để mở khu vực quản lý tương ứng.</p>
              </div>
            </div>
            <div className={styles.metricGrid}>
            <MetricCard
              icon={<ClockCircleOutlined />}
              title="Địa điểm chờ duyệt"
              value={dashboard.locations.pending}
              detail={`${dashboard.locations.overduePending} mục đã chờ quá ${dashboard.locations.overdueThresholdHours} giờ`}
              to="/admin/locations/pending"
              action="Mở hàng chờ"
              tone={dashboard.locations.overduePending > 0 ? 'warning' : 'primary'}
            />
            <MetricCard
              icon={<EnvironmentOutlined />}
              title="Địa điểm công khai"
              value={dashboard.locations.approved}
              detail={`${dashboard.locations.hidden} đang ẩn · ${dashboard.locations.rejected} bị từ chối`}
              to="/admin/locations"
              action="Quản lý địa điểm"
              tone="success"
            />
            <MetricCard
              icon={<StarOutlined />}
              title="Đánh giá hiển thị"
              value={dashboard.reviews.active}
              detail={`${dashboard.reviews.hidden} đã ẩn · ${dashboard.reviews.deleted} đã xóa`}
              to="/admin/reviews"
              action="Quản lý đánh giá"
              tone="accent"
            />
            <MetricCard
              icon={<CalendarOutlined />}
              title="Lịch trình công khai"
              value={dashboard.itineraries.active}
              detail={`${dashboard.itineraries.hidden} lịch trình đang ẩn`}
              to="/admin/itineraries"
              action="Quản lý lịch trình"
              tone="info"
            />
            </div>
          </section>

          {isAdmin && dashboard.users ? (
            <Card
              className={styles.usersCard}
              title={(
                <div className={styles.cardTitle}>
                  <div>
                    <strong>Quản trị người dùng</strong>
                    <span>Thông tin này chỉ hiển thị với quản trị viên</span>
                  </div>
                </div>
              )}
              extra={<Link to="/admin/users">Quản lý người dùng</Link>}
            >
              <div className={styles.userMetricGrid}>
                <UserMetric label="Tổng tài khoản" value={dashboard.users.total} icon={<TeamOutlined />} />
                <UserMetric label="Đang hoạt động" value={dashboard.users.active} icon={<SafetyCertificateOutlined />} />
                <UserMetric label="Bị khóa" value={dashboard.users.locked} icon={<LockOutlined />} />
                <UserMetric label="Moderator" value={dashboard.users.moderators} icon={<TeamOutlined />} />
              </div>
            </Card>
          ) : null}
        </>
      ) : null}
    </main>
  )
}
