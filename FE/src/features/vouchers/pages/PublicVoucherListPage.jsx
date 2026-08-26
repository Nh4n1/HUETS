import { Alert, Empty, Pagination, Select, Skeleton } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { getCategoriesApi } from '../../../shared/api/referenceApi'
import { getActiveCategories } from '../../../shared/config/categoryUtils'
import { useAuth } from '../../auth/context/useAuth'
import { getPublicVouchersApi } from '../api/voucherApi'
import { VoucherDiscoveryCard } from '../components/VoucherDiscoveryCard'
import styles from './PublicVoucherListPage.module.css'

const PAGE_SIZE = 12

export function PublicVoucherListPage() {
  const { loading: authLoading } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const categoryCode = searchParams.get('categoryCode') ?? ''
  const sortBy = ['newest', 'ending_soon'].includes(searchParams.get('sortBy')) ? searchParams.get('sortBy') : 'newest'
  const [vouchers, setVouchers] = useState([])
  const [meta, setMeta] = useState({ total: 0 })
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true
    getCategoriesApi().then((items) => active && setCategories(getActiveCategories(items))).catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (authLoading) return undefined
    let active = true
    getPublicVouchersApi({ page, pageSize: PAGE_SIZE, sortBy, ...(categoryCode ? { categoryCode } : {}) })
      .then((result) => {
        if (!active) return
        setVouchers(result.data ?? [])
        setMeta(result.meta ?? { total: 0 })
        setErrorMessage('')
      })
      .catch((error) => {
        if (!active) return
        setVouchers([])
        setErrorMessage(error.response?.data?.message ?? 'Không thể tải danh sách Voucher.')
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [authLoading, categoryCode, page, sortBy])

  const categoryOptions = useMemo(() => [
    { value: '', label: 'Tất cả chủ đề' },
    ...categories.map((category) => ({ value: category.code, label: category.name })),
  ], [categories])

  const updateQuery = (changes) => {
    setLoading(true)
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => value ? next.set(key, String(value)) : next.delete(key))
    setSearchParams(next)
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span>Ưu đãi tại Huế</span>
        <h1>Khám phá Voucher</h1>
        <p>Các ưu đãi đang còn thời gian nhận tại những địa điểm trên HueTrip.</p>
      </header>
      <div className={styles.toolbar}>
        <Select aria-label="Lọc theo chủ đề" value={categoryCode} options={categoryOptions} onChange={(value) => updateQuery({ categoryCode: value, page: 1 })} />
        <Select aria-label="Sắp xếp Voucher" value={sortBy} options={[
          { value: 'newest', label: 'Mới nhất' },
          { value: 'ending_soon', label: 'Sắp hết thời gian nhận' },
        ]} onChange={(value) => updateQuery({ sortBy: value, page: 1 })} />
      </div>
      {errorMessage ? <Alert type="warning" showIcon message={errorMessage} /> : null}
      {loading ? <div className={styles.grid}>{Array.from({ length: 8 }, (_, index) => <Skeleton.Node key={index} active className={styles.skeleton} />)}</div> : null}
      {!loading && !errorMessage && vouchers.length ? <div className={styles.grid}>{vouchers.map((voucher) => <VoucherDiscoveryCard key={voucher.id} voucher={voucher} />)}</div> : null}
      {!loading && !errorMessage && !vouchers.length ? <Empty description="Chưa có Voucher phù hợp." /> : null}
      {!loading && meta.total > PAGE_SIZE ? <Pagination current={page} pageSize={PAGE_SIZE} total={meta.total} showSizeChanger={false} onChange={(value) => updateQuery({ page: value })} /> : null}
    </main>
  )
}
