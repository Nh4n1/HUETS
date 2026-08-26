import { Alert, Button, Card, Empty, Skeleton, Tag, Typography } from 'antd'
import { EnvironmentOutlined } from '@ant-design/icons'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getBusinessLocationsApi } from '../api/businessApi'
import styles from './BusinessPages.module.css'

export function BusinessLocationsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await getBusinessLocationsApi())
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error.response?.data?.message ?? 'Không thể tải địa điểm đang quản lý.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { Promise.resolve().then(load) }, [load])

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div><span className={styles.eyebrow}>HueTrip Business</span><Typography.Title level={2}>Địa điểm của tôi</Typography.Title><p>Các Location gắn với quyền quản lý đã được xác minh.</p></div>
        <Link to="/business/register"><Button type="primary">Đăng ký thêm địa điểm</Button></Link>
      </header>
      {errorMessage ? <Alert type="error" showIcon message={errorMessage} action={<Button onClick={load}>Thử lại</Button>} /> : null}
      {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
      {!loading && !errorMessage && !items.length ? <Empty description="Chưa có địa điểm được xác minh" /> : null}
      {!loading && items.length ? (
        <div className={styles.locationCardGrid}>
          {items.map((item) => {
            const location = item.location
            const operational = location?.status === 'approved' && !location?.isDeleted
            return (
              <Card key={item.locationId} className={styles.businessLocationCard}
                cover={location?.coverImageUrl ? <img src={location.coverImageUrl} alt={location.name} /> : <div className={styles.locationCardFallback}><EnvironmentOutlined /></div>}>
                <Tag color={operational ? 'success' : 'warning'}>{operational ? 'Đang hoạt động' : 'Tạm không khả dụng'}</Tag>
                <Typography.Title level={4}>{location?.name}</Typography.Title>
                <p>{location?.formattedAddress}</p>
                <div className={styles.locationCardActions}>
                  <Link to={`/locations/${item.locationId}`}><Button>Xem trên Trang cộng đồng</Button></Link>
                  <Link to={`/business/locations/${item.locationId}/vouchers`}><Button type="primary" disabled={!operational}>Quản lý Voucher</Button></Link>
                  <Link to={`/business/locations/${item.locationId}/devices`}><Button disabled={!operational}>Thiết bị quầy</Button></Link>
                </div>
              </Card>
            )
          })}
        </div>
      ) : null}
    </main>
  )
}
