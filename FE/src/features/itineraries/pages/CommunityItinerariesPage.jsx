import { CheckCircleOutlined, FlagOutlined, SearchOutlined } from '@ant-design/icons'
import { Alert, Button, Empty, Input, Pagination, Select, Skeleton } from 'antd'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../../auth/context/useAuth'
import { BookmarkButton } from '../../bookmarks/components/BookmarkButton'
import { createItineraryBookmark } from '../../bookmarks/utils/bookmarkMappers'
import { ReportModal } from '../../reports/components/ReportModal'
import { getPublicItinerariesApi } from '../api/itineraryApi'
import { ItineraryHubHeader } from '../components/ItineraryHubHeader'
import { ItineraryCard } from '../components/ItineraryCard'
import styles from './Itinerary.module.css'

const PAGE_SIZE = 12
const errorMessage = (error, fallback) => error.response?.data?.message ?? fallback

export function CommunityItinerariesPage() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const routerLocation = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(Number(searchParams.get('page')) || 1, 1)
  const q = searchParams.get('q') ?? ''
  const days = searchParams.get('days') ?? ''
  const sort = searchParams.get('sort') ?? 'newest'
  const [queryInput, setQueryInput] = useState(q)
  const [itineraries, setItineraries] = useState([])
  const [meta, setMeta] = useState({ total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [reportTarget, setReportTarget] = useState(null)
  const [reportedItineraryIds, setReportedItineraryIds] = useState(() => new Set())

  const openReport = (itinerary) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: routerLocation } })
      return
    }
    if (itinerary.owner?.id === user?.id || reportedItineraryIds.has(itinerary.id)) return
    setReportTarget(itinerary)
  }

  const updateParams = (changes) => {
    setLoading(true)
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => value ? next.set(key, String(value)) : next.delete(key))
    if (!Object.hasOwn(changes, 'page')) next.delete('page')
    setSearchParams(next)
  }

  useEffect(() => {
    let active = true
    getPublicItinerariesApi({ page, pageSize: PAGE_SIZE, q: q || undefined, days: days || undefined, sort })
      .then((payload) => {
        if (!active) return
        setItineraries(payload.data ?? [])
        setMeta(payload.meta ?? { total: 0 })
        setError('')
      })
      .catch((requestError) => { if (active) setError(errorMessage(requestError, 'Không thể tải lịch trình cộng đồng.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, q, days, sort, reloadKey])

  return (
    <main className={styles.page}>
      <ItineraryHubHeader />
      <nav className={styles.itineraryTabs} aria-label="Loại lịch trình"><Link className={styles.activeTab} to="/itineraries">Cộng đồng</Link><Link to="/itineraries/mine">Của tôi</Link></nav>

      <form className={styles.toolbar} role="search" onSubmit={(event) => { event.preventDefault(); updateParams({ q: queryInput }) }}>
        <Input allowClear size="large" prefix={<SearchOutlined />} placeholder="Tìm lịch trình, địa điểm..." value={queryInput} onChange={(event) => setQueryInput(event.target.value)} onClear={() => updateParams({ q: '' })} />
        <Select size="large" aria-label="Số ngày" value={days} onChange={(value) => updateParams({ days: value })} options={[{ value: '', label: 'Tất cả số ngày' }, ...[1, 2, 3, 4, 5, 6, 7].map((value) => ({ value: String(value), label: `${value} ngày` }))]} />
        <Select size="large" aria-label="Sắp xếp" value={sort} onChange={(value) => updateParams({ sort: value })} options={[{ value: 'newest', label: 'Mới nhất' }, { value: 'updated', label: 'Cập nhật gần đây' }, { value: 'most_stops', label: 'Nhiều điểm dừng' }]} />
      </form>

      {!loading && !error ? <div className={styles.resultLine}><strong>{meta.total} hành trình</strong><span>được cộng đồng chia sẻ</span></div> : null}
      {error ? <Alert showIcon type="error" message={error} action={<Button onClick={() => { setLoading(true); setReloadKey((value) => value + 1) }}>Thử lại</Button>} /> : null}
      {loading ? <div className={styles.cardGrid}>{[1, 2, 3, 4, 5, 6].map((key) => <Skeleton.Node key={key} active className={styles.cardSkeleton} />)}</div> : null}
      {!loading && !error && itineraries.length === 0 ? <section className={styles.emptyPanel}><Empty description={q || days ? 'Không tìm thấy lịch trình phù hợp.' : 'Chưa có lịch trình nào được chia sẻ.'} /><p>{q || days ? 'Thử thay đổi từ khóa hoặc số ngày.' : 'Hãy là người đầu tiên chia sẻ cách bạn khám phá Huế.'}</p>{q || days ? <Button onClick={() => { setQueryInput(''); updateParams({ q: '', days: '' }) }}>Xóa bộ lọc</Button> : <Link to="/itineraries/new"><Button type="primary">Tạo lịch trình</Button></Link>}</section> : null}
      {!loading && itineraries.length > 0 ? (
        <>
          <section className={styles.cardGrid} aria-label="Lịch trình cộng đồng">
            {itineraries.map((itinerary) => (
              <ItineraryCard
                key={itinerary.id}
                itinerary={itinerary}
                variant="community"
                detailTo={`/itineraries/${itinerary.id}`}
                bookmarkAction={<BookmarkButton bookmark={createItineraryBookmark(itinerary)} />}
                onMenuClick={({ key }) => { if (key === 'report') openReport(itinerary) }}
                menuItems={[{
                  key: 'report',
                  icon: reportedItineraryIds.has(itinerary.id) ? <CheckCircleOutlined /> : <FlagOutlined />,
                  disabled: itinerary.owner?.id === user?.id || reportedItineraryIds.has(itinerary.id),
                  label: itinerary.owner?.id === user?.id
                    ? 'Lịch trình của bạn'
                    : reportedItineraryIds.has(itinerary.id) ? 'Đã báo cáo' : 'Báo cáo',
                }]}
              />
            ))}
          </section>
          <div className={styles.pagination}><Pagination current={page} pageSize={PAGE_SIZE} total={meta.total} hideOnSinglePage onChange={(nextPage) => updateParams({ page: nextPage === 1 ? '' : nextPage })} /></div>
        </>
      ) : null}

      <ReportModal
        open={Boolean(reportTarget)}
        targetType="itinerary"
        targetId={reportTarget?.id}
        contextLabel={reportTarget ? `Báo cáo lịch trình "${reportTarget.title}"` : undefined}
        onClose={() => setReportTarget(null)}
        onSubmitted={() => {
          if (!reportTarget) return
          setReportedItineraryIds((current) => new Set(current).add(reportTarget.id))
        }}
      />
    </main>
  )
}
