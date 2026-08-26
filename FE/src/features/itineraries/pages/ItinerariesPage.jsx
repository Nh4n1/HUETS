import { DeleteOutlined, EditOutlined, GlobalOutlined, LockOutlined, PlusOutlined } from '@ant-design/icons'
import { Alert, Button, Empty, Skeleton, message } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { deleteItineraryApi, getItinerariesApi, updateItineraryApi } from '../api/itineraryApi'
import { ItineraryHubHeader } from '../components/ItineraryHubHeader'
import { ItineraryCard } from '../components/ItineraryCard'
import styles from './Itinerary.module.css'

const errorMessage = (error, fallback) => error.response?.data?.message ?? fallback

export function ItinerariesPage() {
  const [itineraries, setItineraries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const requestItineraries = () => getItinerariesApi()
    .then((data) => { setItineraries(Array.isArray(data) ? data : []); setError('') })
    .catch((requestError) => setError(errorMessage(requestError, 'Không thể tải danh sách lịch trình.')))
    .finally(() => setLoading(false))

  useEffect(() => {
    let active = true
    getItinerariesApi()
      .then((data) => { if (active) { setItineraries(Array.isArray(data) ? data : []); setError('') } })
      .catch((requestError) => { if (active) setError(errorMessage(requestError, 'Không thể tải danh sách lịch trình.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const deleteItinerary = async (itinerary) => {
    try {
      await deleteItineraryApi(itinerary.id)
      setItineraries((current) => current.filter((item) => item.id !== itinerary.id))
      message.success('Đã xóa lịch trình.')
    } catch (requestError) {
      message.error(errorMessage(requestError, 'Không thể xóa lịch trình.'))
    }
  }

  const toggleVisibility = async (itinerary) => {
    const nextVisibility = itinerary.visibility === 'public' ? 'private' : 'public'
    try {
      const updated = await updateItineraryApi(itinerary.id, { visibility: nextVisibility })
      setItineraries((current) => current.map((item) => item.id === itinerary.id ? updated : item))
      message.success(nextVisibility === 'public' ? 'Đã chuyển sang công khai.' : 'Đã chuyển sang riêng tư.')
    } catch (requestError) {
      message.error(errorMessage(requestError, 'Không thể đổi quyền riêng tư.'))
    }
  }

  return (
    <main className={styles.page}>
      <ItineraryHubHeader />
      <nav className={styles.itineraryTabs} aria-label="Loại lịch trình"><Link to="/itineraries">Cộng đồng</Link><Link className={styles.activeTab} to="/itineraries/mine">Của tôi</Link></nav>

      {!loading && !error ? <div className={styles.resultLine}><strong>{itineraries.length} lịch trình</strong><span>của bạn</span></div> : null}
      {error ? <Alert showIcon type="error" message={error} action={<Button onClick={() => { setLoading(true); requestItineraries() }}>Thử lại</Button>} /> : null}
      {loading ? <div className={styles.cardGrid}>{[1, 2, 3].map((key) => <Skeleton.Node key={key} active className={styles.cardSkeleton} />)}</div> : null}
      {!loading && !error && itineraries.length === 0 ? (
        <section className={styles.emptyPanel}>
          <Empty description="Bạn chưa có lịch trình nào." />
          <p>Bắt đầu bằng những địa điểm bạn muốn ghé tại Huế.</p>
          <Link to="/itineraries/new"><Button type="primary" icon={<PlusOutlined />}>Tạo lịch trình</Button></Link>
        </section>
      ) : null}

      {!loading && itineraries.length > 0 ? (
        <section className={styles.cardGrid} aria-label="Danh sách lịch trình">
          {itineraries.map((itinerary) => (
            <ItineraryCard
              key={itinerary.id}
              itinerary={itinerary}
              variant="mine"
              detailTo={`/itineraries/mine/${itinerary.id}`}
              onMenuClick={({ key }) => { if (key === 'visibility') toggleVisibility(itinerary); if (key === 'delete') deleteItinerary(itinerary) }}
              menuItems={[
                { key: 'edit', icon: <EditOutlined />, label: <Link to={`/itineraries/mine/${itinerary.id}/edit`}>Chỉnh sửa</Link> },
                { key: 'visibility', disabled: itinerary.status === 'hidden', icon: itinerary.visibility === 'public' ? <LockOutlined /> : <GlobalOutlined />, label: itinerary.status === 'hidden' ? 'Không thể đổi khi đang bị ẩn' : itinerary.visibility === 'public' ? 'Chuyển sang riêng tư' : 'Chuyển sang công khai' },
                { type: 'divider' },
                { key: 'delete', danger: true, icon: <DeleteOutlined />, label: 'Xóa' },
              ]}
            />
          ))}
        </section>
      ) : null}
    </main>
  )
}
