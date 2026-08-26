import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  FileSearchOutlined,
  PlusOutlined,
  SendOutlined,
} from '@ant-design/icons'
import { Alert, Button, Empty, Pagination, Select, Skeleton, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getMyLocationsApi } from '../api/myLocationsApi'
import { formatDateTime, LOCATION_STATUS } from '../myLocationsPresentation'
import styles from './LocationWorkflowPage.module.css'

const PAGE_SIZE = 12

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ kiểm duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Cần bổ sung' },
  { value: 'withdrawn', label: 'Đã rút' },
  { value: 'hidden', label: 'Đã ẩn' },
]

const CARD_COPY = {
  pending: { text: 'Hồ sơ đang được kiểm duyệt. Bạn vẫn có thể chỉnh sửa khi cần.', action: 'Xem hồ sơ', icon: <ClockCircleOutlined /> },
  approved: { text: 'Địa điểm đã được công khai trên Huế Trip.', action: 'Xem chi tiết', icon: <CheckCircleOutlined /> },
  rejected: { text: 'Địa điểm cần được cập nhật trước khi gửi duyệt lại.', action: 'Xem và chỉnh sửa', icon: <EditOutlined /> },
  withdrawn: { text: 'Bạn đã rút hồ sơ này khỏi hàng chờ kiểm duyệt.', action: 'Xem thông tin', icon: <FileSearchOutlined /> },
  hidden: { text: 'Địa điểm đã bị ẩn khỏi nội dung công khai.', action: 'Xem thông tin', icon: <EyeOutlined /> },
}

export function MyContributionsPage() {
  const [locations, setLocations] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true
    getMyLocationsApi({ page, pageSize: PAGE_SIZE, status: status || undefined })
      .then(({ data, meta }) => {
        if (!active) return
        setLocations(data)
        setTotal(meta.total)
        setErrorMessage('')
      })
      .catch((error) => {
        if (!active) return
        setErrorMessage(error.response?.data?.message ?? 'Không thể tải danh sách địa điểm đã đóng góp.')
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [page, status])

  return (
    <main className={`${styles.page} ${styles.listPage}`}>
      <header className={styles.contributionHero}>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>Đóng góp cho cộng đồng</span>
          <Typography.Title level={1}>Địa điểm tôi đã đóng góp</Typography.Title>
          <p>Theo dõi từng hồ sơ, xem phản hồi kiểm duyệt và bổ sung thông tin ngay tại đây.</p>
          <Link to="/locations/contribute">
            <Button type="primary" size="large" icon={<PlusOutlined />}>Đóng góp địa điểm mới</Button>
          </Link>
        </div>
        <div className={styles.workflowGraphic} aria-hidden="true">
          <div><SendOutlined /><span>Gửi thông tin</span></div>
          <ArrowRightOutlined />
          <div><FileSearchOutlined /><span>Kiểm duyệt</span></div>
          <ArrowRightOutlined />
          <div><CheckCircleOutlined /><span>Công khai</span></div>
        </div>
      </header>

      <section className={styles.guideStrip}>
        <div><strong>Chờ duyệt</strong><span>Có thể xem và chỉnh sửa hồ sơ.</span></div>
        <div><strong>Cần bổ sung</strong><span>Sửa theo phản hồi rồi gửi lại.</span></div>
        <div><strong>Đã duyệt</strong><span>Địa điểm đã hiển thị công khai.</span></div>
      </section>

      {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}

      <section className={styles.toolbar} aria-label="Lọc địa điểm đã đóng góp">
        <div>
          <Typography.Title level={3}>Danh sách đóng góp</Typography.Title>
          <Typography.Text type="secondary">{total} địa điểm {status ? 'trong trạng thái này' : 'đã gửi'}</Typography.Text>
        </div>
        <Select value={status} options={STATUS_FILTER_OPTIONS} onChange={(value) => { setLoading(true); setPage(1); setStatus(value) }} />
      </section>

      {loading ? (
        <div className={styles.contributionGrid}>
          {Array.from({ length: 3 }, (_, index) => <Skeleton.Node key={index} active className={styles.cardSkeleton} />)}
        </div>
      ) : locations.length === 0 ? (
        <Empty
          className={styles.empty}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={status ? 'Không có địa điểm nào ở trạng thái này.' : 'Bạn chưa đóng góp địa điểm nào.'}
        >
          {!status ? <Link to="/locations/contribute"><Button type="primary" icon={<PlusOutlined />}>Đóng góp ngay</Button></Link> : null}
        </Empty>
      ) : (
        <div className={styles.contributionGrid}>
          {locations.map((location) => {
            const presentation = LOCATION_STATUS[location.status] ?? { label: location.status, color: 'default' }
            const copy = CARD_COPY[location.status] ?? CARD_COPY.pending
            return (
              <article className={styles.contributionCard} key={location.id}>
                <Link className={styles.cardMedia} to={`/locations/mine/${location.id}`} aria-label={`Xem ${location.name}`}>
                  {location.coverImageUrl
                    ? <img src={location.coverImageUrl} alt="" />
                    : <span><EnvironmentOutlined /></span>}
                  <Tag color={presentation.color}>{presentation.label}</Tag>
                </Link>
                <div className={styles.cardBody}>
                  <div className={styles.cardTitleRow}>
                    <span className={styles.cardStatusIcon}>{copy.icon}</span>
                    <div>
                      <Typography.Title level={3}>{location.name}</Typography.Title>
                      <span className={styles.cardAddress}><EnvironmentOutlined /> {location.formattedAddress}</span>
                    </div>
                  </div>
                  <p className={styles.cardCopy}>{copy.text}</p>
                  {location.status === 'rejected' && location.rejectionReason ? (
                    <div className={styles.cardReview}><strong>Phản hồi:</strong> {location.rejectionReason}</div>
                  ) : null}
                  {location.status === 'hidden' && location.hiddenReason ? (
                    <div className={styles.cardReview}><strong>Lý do ẩn:</strong> {location.hiddenReason}</div>
                  ) : null}
                  <div className={styles.cardFooter}>
                    <span>Gửi {formatDateTime(location.submittedAt)}</span>
                    <Link to={`/locations/mine/${location.id}`}>
                      <Button type={location.status === 'rejected' ? 'primary' : 'link'}>
                        {copy.action} <ArrowRightOutlined />
                      </Button>
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {total > PAGE_SIZE ? (
        <Pagination className={styles.pagination} current={page} pageSize={PAGE_SIZE} total={total} onChange={(value) => { setLoading(true); setPage(value) }} showSizeChanger={false} />
      ) : null}
    </main>
  )
}
