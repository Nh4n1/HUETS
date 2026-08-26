import { Alert, Button, Empty, Skeleton, Statistic, Tabs, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getPublicLocationByIdApi } from '../../locations/api/locationApi'
import { getOwnerVouchersApi } from '../api/voucherApi'
import { VoucherCard } from '../components/VoucherCard'
import styles from './VoucherPages.module.css'

const TABS = { draft: 'Bản nháp', active: 'Đang chạy', paused: 'Tạm dừng', ended: 'Đã kết thúc' }

export function OwnerVoucherListPage() {
  const { locationId } = useParams()
  const [location, setLocation] = useState(null)
  const [vouchers, setVouchers] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [locationData, response] = await Promise.all([getPublicLocationByIdApi(locationId), getOwnerVouchersApi(locationId, { pageSize: 100 })])
      setLocation(locationData); setVouchers(response.data ?? []); setErrorMessage('')
    } catch (error) { setErrorMessage(error.response?.data?.message ?? 'Không thể tải Voucher của Location.') }
    finally { setLoading(false) }
  }, [locationId])
  useEffect(() => { Promise.resolve().then(load) }, [load])
  const totals = useMemo(() => vouchers.reduce((sum, item) => ({ claims: sum.claims + item.claimedCount, redeemed: sum.redeemed + item.redeemedCount, quantity: sum.quantity + item.totalQuantity }), { claims: 0, redeemed: 0, quantity: 0 }), [vouchers])
  return (
    <main className={styles.page}>
      <header className={styles.hero}><div><span className={styles.eyebrow}>Voucher · {location?.name ?? 'Location'}</span><Typography.Title level={2}>Quản lý Voucher</Typography.Title><p>Mỗi Voucher chỉ thuộc Location và issuing ownership hiện tại.</p></div><div className={styles.actions}><Link to={`/business/locations/${locationId}/devices`}><Button>Thiết bị quầy</Button></Link><Link to={`/business/locations/${locationId}/vouchers/new`}><Button type="primary" size="large" icon={<PlusOutlined />}>Tạo Voucher</Button></Link></div></header>
      {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}
      {loading ? <Skeleton active /> : <><div className={styles.kpis}><Statistic title="Chương trình" value={vouchers.length} /><Statistic title="Đã nhận" value={totals.claims} /><Statistic title="Đã sử dụng" value={totals.redeemed} /><Statistic title="Còn suất" value={Math.max(0, totals.quantity - totals.claims)} /></div><Tabs items={Object.entries(TABS).map(([key, label]) => { const items = vouchers.filter((voucher) => voucher.status === key); return { key, label: `${label} (${items.length})`, children: items.length ? <div className={styles.grid}>{items.map((voucher) => <VoucherCard key={voucher.id} voucher={voucher} owner />)}</div> : <Empty description={`Chưa có Voucher ${label.toLowerCase()}.`} /> } })} /></>}
    </main>
  )
}
