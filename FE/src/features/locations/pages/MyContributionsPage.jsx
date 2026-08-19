import { EnvironmentOutlined, PlusOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Empty, Pagination, Select, Spin, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getMyLocationsApi } from '../api/myLocationsApi'
import { formatDateTime, LOCATION_STATUS } from '../myLocationsPresentation'

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
    <main className="page-container" style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>Địa điểm tôi đã đóng góp</Typography.Title>
          <Typography.Text type="secondary">
            Theo dõi trạng thái kiểm duyệt của các địa điểm bạn đã gửi.
          </Typography.Text>
        </div>
        <Link to="/locations/contribute">
          <Button type="primary" icon={<PlusOutlined />}>
            Đóng góp địa điểm mới
          </Button>
        </Link>
      </div>

      {errorMessage ? <Alert type="error" showIcon message={errorMessage} style={{ marginBottom: 16 }} /> : null}

      <Select
        value={status}
        options={STATUS_FILTER_OPTIONS}
        onChange={handleStatusChange}
        style={{ width: 220, marginBottom: 16 }}
      />

      {loading ? (
        <Spin />
      ) : locations.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Bạn chưa đóng góp địa điểm nào."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {locations.map((location) => {
            const presentation = LOCATION_STATUS[location.status] ?? {
              label: location.status,
              color: 'default',
            }

            return (
              <Card key={location.id} variant="borderless">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Typography.Title level={4} style={{ margin: 0 }}>
                        {location.name}
                      </Typography.Title>
                      <Tag color={presentation.color}>{presentation.label}</Tag>
                    </div>
                    <Typography.Text type="secondary">
                      <EnvironmentOutlined /> {location.formattedAddress}
                    </Typography.Text>
                    <div style={{ marginTop: 4 }}>
                      <Typography.Text type="secondary">
                        Gửi lúc: {formatDateTime(location.submittedAt)}
                      </Typography.Text>
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
        <Pagination
          style={{ marginTop: 24, textAlign: 'right' }}
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