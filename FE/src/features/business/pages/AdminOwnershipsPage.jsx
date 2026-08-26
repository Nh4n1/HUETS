import { Alert, Button, Input, Select, Table, Tag, Typography } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { getAdminOwnershipsApi } from '../api/adminOwnershipApi'
import { BusinessStatusTag } from '../components/BusinessStatusTag'
import styles from './AdminOwnershipPages.module.css'

const PAGE_SIZE = 20

export function AdminOwnershipsPage() {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('pending')
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await getAdminOwnershipsApi({ page, pageSize: PAGE_SIZE, ...(status ? { status } : {}) })
      setItems(response.data ?? [])
      setTotal(response.meta?.total ?? 0)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error.response?.data?.message ?? 'Không thể tải hàng chờ ownership.')
    } finally { setLoading(false) }
  }, [page, status])

  useEffect(() => { Promise.resolve().then(load) }, [load])

  const filtered = useMemo(() => {
    const query = searchText.trim().toLocaleLowerCase('vi')
    if (!query) return items
    return items.filter((item) => [item.location?.name, item.location?.formattedAddress, item.applicant?.displayName, item.applicant?.email].some((value) => value?.toLocaleLowerCase('vi').includes(query)))
  }, [items, searchText])

  const columns = [
    { title: 'Địa điểm', dataIndex: ['location', 'name'], render: (_, item) => <div className={styles.locationCell}><strong>{item.location?.name}</strong><span>{item.location?.formattedAddress}</span>{item.location?.status !== 'approved' ? <Tag color="warning">Location {item.location?.status}</Tag> : null}</div> },
    { title: 'Applicant', render: (_, item) => <div className={styles.locationCell}><strong>{item.applicant?.displayName}</strong><span>{item.applicant?.email}</span></div> },
    { title: 'Loại', dataIndex: 'locationMode', render: (value) => value === 'new' ? 'Location mới' : 'Location có sẵn' },
    { title: 'Trạng thái', render: (_, item) => <BusinessStatusTag ownership={item} /> },
    { title: 'Gửi lúc', dataIndex: 'submittedAt', render: (value) => new Date(value).toLocaleString('vi-VN') },
    { title: '', fixed: 'right', width: 110, render: (_, item) => <Link to={`/admin/location-ownerships/${item.id}`}><Button type="primary" size="small">Xử lý</Button></Link> },
  ]

  return (
    <main className={styles.page}>
      <header className={styles.header}><div><span>HueTrip Admin</span><Typography.Title level={2}>Xác minh doanh nghiệp</Typography.Title><Typography.Text type="secondary">Chỉ Admin được xem bằng chứng và ra quyết định ownership.</Typography.Text></div></header>
      <section className={styles.toolbar}>
        <Input prefix={<SearchOutlined />} allowClear value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Tìm trong trang theo Location hoặc applicant" />
        <Select value={status} onChange={(value) => { setStatus(value); setPage(1) }} options={[
          { value: '', label: 'Tất cả trạng thái' }, { value: 'pending', label: 'Đang xử lý' }, { value: 'verified', label: 'Đã xác minh' }, { value: 'rejected', label: 'Cần bổ sung' }, { value: 'revoked', label: 'Đã thu hồi' }, { value: 'cancelled', label: 'Đã hủy' },
        ]} />
      </section>
      {errorMessage ? <Alert type="error" showIcon message={errorMessage} action={<Button onClick={load}>Thử lại</Button>} /> : null}
      <Table rowKey="id" loading={loading} dataSource={filtered} columns={columns} scroll={{ x: 850 }} pagination={{ current: page, pageSize: PAGE_SIZE, total, showSizeChanger: false, onChange: setPage }} />
    </main>
  )
}
