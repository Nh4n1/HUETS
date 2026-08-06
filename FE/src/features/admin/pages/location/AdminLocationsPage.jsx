import { Alert, Button, Table, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getLocationsApi } from '../../api/adminLocationsApi'

const PAGE_SIZE = 12

const columns = [
  { title: 'Tên địa điểm', dataIndex: 'name', key: 'name' },
  {
    title: 'Danh mục',
    key: 'category',
    render: (_, record) => record.category?.name,
  },
  { title: 'Địa chỉ', dataIndex: 'formattedAddress', key: 'formattedAddress' },
  {
    title: 'Đánh giá',
    key: 'rating',
    render: (_, record) => `${record.averageRating.toFixed(1)} (${record.reviewCount})`,
  },
  {
    title: 'Đặc điểm',
    key: 'tags',
    render: (_, record) => (
      <>
        {record.tagCodes.map((code) => (
          <Tag key={code}>{code}</Tag>
        ))}
      </>
    ),
  },
]

export function AdminLocationsPage() {
  const [locations, setLocations] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)

    getLocationsApi({ page, pageSize: PAGE_SIZE })
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
  }, [page])

  return (
    <main className="page-container">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Typography.Title level={2}>Quản lý địa điểm</Typography.Title>
        <Link to="/admin/locations/new">
          <Button type="primary">Thêm địa điểm</Button>
        </Link>
      </div>

      {errorMessage ? (
        <Alert
          type="error"
          showIcon
          message={errorMessage}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <Table
        rowKey="id"
        loading={loading}
        dataSource={locations}
        columns={columns}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          onChange: setPage,
        }}
      />
    </main>
  )
}
