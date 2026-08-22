import { EnvironmentOutlined, PlusOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Empty, Pagination, Select, Spin, Tag, Typography } from 'antd'
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
  { value: 'rejected', label: 'Đã từ chối' },
]

export function MyContributionsPage() {
  const [locations, setLocations] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true

    getMyLocationsApi({
      page,
      pageSize: PAGE_SIZE,
      status: status || undefined,
    })
      .then(({ data, meta }) => {
        if (!active) return
        setLocations(data)
        setTotal(meta.total)
        setErrorMessage('')
      })
      .catch((error) => {
        if (!active) return
        setErrorMessage(
          error.response?.data?.message ?? 'Không thể tải danh sách địa điểm đã đóng góp.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [page, status])

  function handlePageChange(nextPage) {
    setLoading(true)
    setPage(nextPage)
  }

  function handleStatusChange(value) {
    setLoading(true)
    setPage(1)
    setStatus(value)
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Đóng góp của bạn</span>
          <Typography.Title level={2}>Địa điểm tôi đã đóng góp</Typography.Title>
          <p>Theo dõi trạng thái kiểm duyệt của các địa điểm bạn đã gửi.</p>
        </div>
        <Link to="/locations/contribute">
          <Button type="primary" icon={<PlusOutlined />}>
            Đóng góp địa điểm mới
          </Button>
        </Link>
      </header>

      {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}

      <section className={styles.toolbar} aria-label="Lọc địa điểm đã đóng góp">
        <Typography.Text type="secondary">{total} địa điểm</Typography.Text>
        <Select value={status} options={STATUS_FILTER_OPTIONS} onChange={handleStatusChange} />
      </section>

      {loading ? (
        <div className={styles.loading}><Spin tip="Đang tải đóng góp..." /></div>
      ) : locations.length === 0 ? (
        <Empty className={styles.empty}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Bạn chưa đóng góp địa điểm nào."
        />
      ) : (
        <div className={styles.list}>
          {locations.map((location) => {
            const presentation = LOCATION_STATUS[location.status] ?? {
              label: location.status,
              color: 'default',
            }

            return (
              <Card className={styles.item} key={location.id}>
                <div className={styles.itemRow}>
                  <div className={styles.itemMain}>
                    <div className={styles.itemHeading}>
                      <Typography.Title level={4}>
                        {location.name}
                      </Typography.Title>
                      <Tag color={presentation.color}>{presentation.label}</Tag>
                    </div>
                    <div className={styles.meta}>
                      <span><EnvironmentOutlined /> {location.formattedAddress}</span>
                      <span>Gửi lúc: {formatDateTime(location.submittedAt)}</span>
                    </div>
                    {location.status === 'rejected' && location.rejectionReason ? (
                      <Alert
                        type="warning"
                        showIcon
                        style={{ marginTop: 8 }}
                        message="Lý do từ chối"
                        description={location.rejectionReason}
                      />
                    ) : null}
                    {location.status === 'hidden' && location.hiddenReason ? (
                      <Alert
                        type="warning"
                        showIcon
                        style={{ marginTop: 8 }}
                        message="Địa điểm đang bị ẩn"
                        description={location.hiddenReason}
                      />
                    ) : null}
                  </div>

                  {location.status === 'approved' ? (
                    <Link to={`/locations/${location.id}`}>
                      <Button>Xem địa điểm</Button>
                    </Link>
                  ) : null}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {total > PAGE_SIZE ? (
        <Pagination className={styles.pagination}
          current={page}
          pageSize={PAGE_SIZE}
          total={total}
          onChange={handlePageChange}
          showSizeChanger={false}
        />
      ) : null}
    </main>
  )
}
