import { CalendarOutlined, EnvironmentOutlined, EyeOutlined, UserOutlined } from '@ant-design/icons'
import { Alert, Avatar, Button, Empty, Pagination, Skeleton } from 'antd'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { getPublicItinerariesApi } from '../api/itineraryApi'
import styles from './Itinerary.module.css'

const PAGE_SIZE = 12
const errorMessage = (error, fallback) => error.response?.data?.message ?? fallback

export function CommunityItinerariesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(Number(searchParams.get('page')) || 1, 1)
  const [itineraries, setItineraries] = useState([])
  const [meta, setMeta] = useState({ total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    getPublicItinerariesApi({ page, pageSize: PAGE_SIZE })
      .then((payload) => {
        if (!active) return
        setItineraries(payload.data ?? [])
        setMeta(payload.meta ?? { total: 0 })
        setError('')
      })
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError, 'Không thể tải lịch trình cộng đồng.'))
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, reloadKey])

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div><span className={styles.eyebrow}>Cảm hứng từ cộng đồng</span><h1>Lịch trình được chia sẻ</h1><p>Tham khảo những cách khám phá Huế đã được cộng đồng lên kế hoạch.</p></div>
        <Link to="/itineraries/new"><Button type="primary" size="large">Tạo hành trình của bạn</Button></Link>
      </section>

      <nav className={styles.itineraryTabs} aria-label="Loại lịch trình">
        <Link className={styles.activeTab} to="/itineraries">Cộng đồng</Link>
        <Link to="/itineraries/mine">Của tôi</Link>
      </nav>

      {error ? <Alert showIcon type="error" message={error} action={<Button onClick={() => { setLoading(true); setReloadKey((value) => value + 1) }}>Thử lại</Button>} /> : null}
      {loading ? <div className={styles.cardGrid}>{[1, 2, 3].map((key) => <Skeleton.Node key={key} active className={styles.cardSkeleton} />)}</div> : null}
      {!loading && !error && itineraries.length === 0 ? <section className={styles.emptyPanel}><Empty description="Chưa có lịch trình công khai nào." /></section> : null}
      {!loading && itineraries.length > 0 ? (
        <>
          <section className={styles.cardGrid} aria-label="Lịch trình cộng đồng">
            {itineraries.map((itinerary) => {
              const itemCount = itinerary.days.reduce((total, day) => total + day.items.length, 0)
              return (
                <article className={styles.itineraryCard} key={itinerary.id}>
                  <div className={styles.ownerLine}><Avatar size={28} src={itinerary.owner?.avatarUrl} icon={<UserOutlined />} /><span>{itinerary.owner?.displayName ?? 'Thành viên HueTrip'}</span></div>
                  <h2>{itinerary.title}</h2>
                  <p className={styles.cardDescription}>{itinerary.description || 'Một hành trình khám phá Huế từ cộng đồng.'}</p>
                  <div className={styles.cardStats}><span><CalendarOutlined /> {itinerary.days.length} ngày</span><span><EnvironmentOutlined /> {itemCount} địa điểm</span></div>
                  <div className={styles.cardActions}><Link to={`/itineraries/${itinerary.id}`}><Button type="primary" icon={<EyeOutlined />}>Xem hành trình</Button></Link></div>
                </article>
              )
            })}
          </section>
          <div className={styles.pagination}><Pagination current={page} pageSize={PAGE_SIZE} total={meta.total} hideOnSinglePage onChange={(nextPage) => setSearchParams(nextPage === 1 ? {} : { page: String(nextPage) })} /></div>
        </>
      ) : null}
    </main>
  )
}
