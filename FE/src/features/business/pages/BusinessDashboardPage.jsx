import { Alert, Button, Card, Empty, Skeleton, Statistic, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getBusinessLocationsApi, getBusinessSummaryApi } from '../api/businessApi'
import styles from './BusinessPages.module.css'

export function BusinessDashboardPage() {
  const [summary, setSummary] = useState(null)
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true
    Promise.allSettled([getBusinessSummaryApi(), getBusinessLocationsApi()])
      .then(([summaryResult, locationResult]) => {
        if (!active) return
        if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value)
        if (locationResult.status === 'fulfilled') setLocations(locationResult.value ?? [])
        setErrorMessage(summaryResult.status === 'rejected' || locationResult.status === 'rejected'
          ? 'Không thể tải đầy đủ dữ liệu Business Workspace.' : '')
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  if (loading) return <main className={styles.page}><Skeleton active paragraph={{ rows: 8 }} /></main>

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div><span className={styles.eyebrow}>HueTrip Business</span><Typography.Title level={2}>Tổng quan</Typography.Title><p>Quản lý địa điểm, Voucher và thiết bị quầy trong một workspace riêng.</p></div>
        <Link to="/business/register"><Button type="primary" icon={<PlusOutlined />}>Đăng ký địa điểm</Button></Link>
      </header>
      {errorMessage ? <Alert type="warning" showIcon message={errorMessage} /> : null}
      <div className={styles.statsGrid}>
        <Card><Statistic title="Địa điểm đang quản lý" value={summary?.verifiedCount ?? locations.length} /></Card>
        <Card><Statistic title="Yêu cầu đang xử lý" value={summary?.pendingCount ?? 0} /></Card>
        <Card><Statistic title="Yêu cầu cần bổ sung" value={summary?.rejectedCount ?? 0} /></Card>
      </div>

      <Card title="Địa điểm của bạn" extra={locations.length ? <Link to="/business/locations">Xem tất cả</Link> : null}>
        {locations.length ? (
          <div className={styles.businessLocationList}>
            {locations.slice(0, 4).map((item) => (
              <div className={styles.businessLocationRow} key={item.locationId}>
                {item.location?.coverImageUrl ? <img src={item.location.coverImageUrl} alt={item.location.name} /> : <div className={styles.locationPlaceholder} />}
                <div><strong>{item.location?.name}</strong><span>{item.location?.formattedAddress}</span></div>
                <div className={styles.actions}>
                  <Link to={`/business/locations/${item.locationId}/vouchers`}><Button>Voucher</Button></Link>
                  <Link to={`/business/locations/${item.locationId}/devices`}><Button>Thiết bị</Button></Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty description="Chưa có địa điểm kinh doanh được xác minh">
            <div className={styles.emptyActions}><Link to="/business/register"><Button type="primary">Đăng ký địa điểm</Button></Link><Link to="/business/ownerships"><Button>Xem trạng thái yêu cầu</Button></Link></div>
          </Empty>
        )}
      </Card>
    </main>
  )
}
