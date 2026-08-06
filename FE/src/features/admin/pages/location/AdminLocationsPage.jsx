import { Alert, Button, Select, Space, Table, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getAdminLocationsApi } from '../../api/adminLocationsApi'
import {
  formatDateTime,
  LOCATION_STATUS,
} from '../../components/location/locationPresentation'

const PAGE_SIZE = 12

export function AdminLocationsPage({ fixedStatus, title = 'Quản lý địa điểm' }) {
  const [locations, setLocations] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState(fixedStatus ?? '')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true

    getAdminLocationsApi({
      page,
      pageSize: PAGE_SIZE,
      status: (fixedStatus ?? status) || undefined,
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
          error.response?.data?.message ?? 'Không thể tải danh sách địa điểm.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [fixedStatus, page, status])

  const columns = [
    {
      title: 'Tên địa điểm',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Link to={`/admin/locations/${record.id}`}>{name}</Link>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value) => {
        const presentation = LOCATION_STATUS[value] ?? { label: value, color: 'default' }
        return <Tag color={presentation.color}>{presentation.label}</Tag>
      },
    },
    {
      title: 'Danh mục',
      key: 'category',
      render: (_, record) => record.category?.name,
    },
    { title: 'Địa chỉ', dataIndex: 'formattedAddress', key: 'formattedAddress' },
    {
      title: 'Người đóng góp',
      key: 'contributor',
      render: (_, record) => record.contributor?.displayName ?? 'Không xác định',
    },
    {
      title: 'Cập nhật',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: formatDateTime,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Link to={`/admin/locations/${record.id}`}>
          {record.status === 'pending' ? 'Kiểm duyệt' : 'Xem chi tiết'}
        </Link>
      ),
    },
  ]

  function handlePageChange(nextPage) {
    setLoading(true)
    setPage(nextPage)
  }

  function handleStatusChange(nextStatus) {
    setLoading(true)
    setPage(1)
    setStatus(nextStatus)
  }

  return (
    <main className="page-container">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <Typography.Title level={2} style={{ margin: 0 }}>{title}</Typography.Title>
        <Space wrap>
          {fixedStatus ? null : (
            <Select
              value={status}
              onChange={handleStatusChange}
              style={{ minWidth: 180 }}
              options={[
                { value: '', label: 'Tất cả trạng thái' },
                ...Object.entries(LOCATION_STATUS).map(([value, item]) => ({
                  value,
                  label: item.label,
                })),
              ]}
            />
          )}
          <Link to="/admin/locations/new">
            <Button type="primary">Thêm địa điểm</Button>
          </Link>
        </Space>
      </div>

      {errorMessage ? (
        <Alert type="error" showIcon message={errorMessage} style={{ marginBottom: 16 }} />
      ) : null}

      <Table
        rowKey="id"
        loading={loading}
        dataSource={locations}
        columns={columns}
        scroll={{ x: 1000 }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showTotal: (value) => `${value} địa điểm`,
          onChange: handlePageChange,
        }}
      />
    </main>
  )
}
