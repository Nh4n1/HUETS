import { CalendarOutlined, DeleteOutlined, EditOutlined, EllipsisOutlined, EnvironmentOutlined, EyeOutlined, GlobalOutlined, LockOutlined, PlusOutlined } from '@ant-design/icons'
import { Alert, Button, Dropdown, Empty, Skeleton, Tag, message } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { deleteItineraryApi, getItinerariesApi, updateItineraryApi } from '../api/itineraryApi'
import { ItineraryHubHeader } from '../components/ItineraryHubHeader'
import styles from './Itinerary.module.css'

const errorMessage = (error, fallback) => error.response?.data?.message ?? fallback
const countItems = (itinerary) => itinerary.days.reduce((total, day) => total + day.items.length, 0)
const firstCover = (itinerary) => itinerary.days.flatMap((day) => day.items).find((item) => item.availability !== 'unavailable' && item.location?.coverImageUrl)?.location?.coverImageUrl

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

      {error ? <Alert showIcon type="error" message={error} action={<Button onClick={() => { setLoading(true); requestItineraries() }}>Thử lại</Button>} /> : null}
      {loading ? <div className={styles.cardGrid}>{[1, 2, 3].map((key) => <Skeleton.Node key={key} active className={styles.cardSkeleton} />)}</div> : null}
      {!loading && !error && itineraries.length === 0 ? (
        <section className={styles.emptyPanel}>
          <Empty description="Bạn chưa có lịch trình nào." />
          <p>Tạo hành trình đầu tiên của riêng bạn.</p>
          <Link to="/itineraries/new"><Button type="primary" icon={<PlusOutlined />}>Tạo thủ công</Button></Link>
        </section>
      ) : null}

      {!loading && itineraries.length > 0 ? (
        <section className={styles.cardGrid} aria-label="Danh sách lịch trình">
          {itineraries.map((itinerary) => (
            <article className={styles.itineraryCard} key={itinerary.id}>
              <div className={styles.cardCover}>{firstCover(itinerary) ? <img src={firstCover(itinerary)} alt="" loading="lazy" /> : <EnvironmentOutlined />}</div>
              <div className={styles.cardBody}>
                <div className={styles.cardTopline}>
                  <Tag color={itinerary.visibility === 'public' ? 'green' : 'default'} icon={itinerary.visibility === 'public' ? <GlobalOutlined /> : <LockOutlined />}>{itinerary.visibility === 'public' ? 'Công khai' : 'Riêng tư'}</Tag>
                  {itinerary.status === 'hidden' ? <Tag color="orange">Đã bị ẩn</Tag> : null}
                  <span>Cập nhật {new Date(itinerary.updatedAt).toLocaleDateString('vi-VN')}</span>
                </div>
                <h2>{itinerary.title}</h2>
                <p className={styles.cardDescription}>{itinerary.description || 'Một hành trình khám phá Huế đang chờ bạn.'}</p>
                {itinerary.status === 'hidden' && itinerary.moderation?.hiddenReason ? <Alert showIcon type="warning" message={`Lý do ẩn: ${itinerary.moderation.hiddenReason}`} /> : null}
                <div className={styles.cardStats}><span><CalendarOutlined /> {itinerary.days.length} ngày</span><span><EnvironmentOutlined /> {countItems(itinerary)} điểm dừng</span></div>
                <div className={styles.cardActions}>
                  <Link to={`/itineraries/mine/${itinerary.id}`}><Button type="primary" icon={<EyeOutlined />}>Xem</Button></Link>
                  <Dropdown trigger={['click']} menu={{ onClick: ({ key }) => { if (key === 'visibility') toggleVisibility(itinerary); if (key === 'delete') deleteItinerary(itinerary) }, items: [
                    { key: 'edit', icon: <EditOutlined />, label: <Link to={`/itineraries/mine/${itinerary.id}/edit`}>Chỉnh sửa</Link> },
                    { key: 'visibility', disabled: itinerary.status === 'hidden', icon: itinerary.visibility === 'public' ? <LockOutlined /> : <GlobalOutlined />, label: itinerary.status === 'hidden' ? 'Không thể đổi khi đang bị ẩn' : itinerary.visibility === 'public' ? 'Chuyển sang riêng tư' : 'Chuyển sang công khai' },
                    { type: 'divider' },
                    { key: 'delete', danger: true, icon: <DeleteOutlined />, label: 'Xóa' },
                  ] }}><Button type="text" aria-label={`Thêm hành động cho ${itinerary.title}`} icon={<EllipsisOutlined />} /></Dropdown>
                </div>
              </div>
            </article>
          ))}
          <Link className={styles.createCard} to="/itineraries/new"><span className={styles.createPlus}><PlusOutlined /></span><strong>Tạo hành trình mới</strong><span>Bắt đầu từ những địa điểm bạn yêu thích</span></Link>
        </section>
      ) : null}
    </main>
  )
}
