import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  EnvironmentOutlined,
  FlagOutlined,
  GlobalOutlined,
  LockOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Alert, Button, Dropdown, Empty, Spin, Tag, message } from 'antd'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useAuth } from '../../auth/context/useAuth'
import { BookmarkButton } from '../../bookmarks/components/BookmarkButton'
import { createItineraryBookmark } from '../../bookmarks/utils/bookmarkMappers'
import { ReportModal } from '../../reports/components/ReportModal'
import { copyPublicItineraryApi, deleteItineraryApi, getItineraryApi, getPublicItineraryApi } from '../api/itineraryApi'
import styles from './Itinerary.module.css'

const errorMessage = (error, fallback) => error.response?.data?.message ?? fallback

export function ItineraryDetailPage({ publicView = false }) {
  const { itineraryId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user } = useAuth()
  const [itinerary, setItinerary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [copying, setCopying] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportedItineraryIds, setReportedItineraryIds] = useState(() => new Set())
  const hasReported = reportedItineraryIds.has(itineraryId)

  const handleReportClick = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } })
      return
    }
    if (itinerary?.owner?.id === user?.id || hasReported) return
    setReportOpen(true)
  }

  useEffect(() => {
    let active = true
    const request = publicView ? getPublicItineraryApi : getItineraryApi
    request(itineraryId)
      .then((data) => { if (active) setItinerary(data) })
      .catch((requestError) => { if (active) setError(errorMessage(requestError, 'Không thể tải lịch trình.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [itineraryId, publicView])

  const copyItinerary = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } })
      return
    }
    try {
      setCopying(true)
      const copied = await copyPublicItineraryApi(itineraryId)
      message.success('Đã sao chép vào lịch trình của bạn.')
      navigate(`/itineraries/mine/${copied.id}`)
    } catch (requestError) {
      message.error(errorMessage(requestError, 'Không thể sao chép lịch trình.'))
    } finally {
      setCopying(false)
    }
  }

  const confirmDelete = async () => {
    try {
      setDeleting(true)
      await deleteItineraryApi(itineraryId)
      message.success('Đã xóa lịch trình.')
      navigate('/itineraries/mine', { replace: true })
    } catch (requestError) {
      message.error(errorMessage(requestError, 'Không thể xóa lịch trình.'))
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className={styles.fullState}><Spin size="large" tip="Đang mở lịch trình..." /></div>
  if (error) return <main className={styles.page}><Alert showIcon type="error" message={error} action={<Link to={publicView ? '/itineraries' : '/itineraries/mine'}><Button>Quay lại</Button></Link>} /></main>
  if (!itinerary) return <main className={styles.page}><Empty description="Không tìm thấy lịch trình." /></main>

  const totalItems = itinerary.days.reduce((total, day) => total + day.items.length, 0)

  return (
    <main className={styles.page}>
      <div className={styles.detailToolbar}>
        <Link to={publicView ? '/itineraries' : '/itineraries/mine'}><Button type="text" icon={<ArrowLeftOutlined />}>{publicView ? 'Lịch trình cộng đồng' : 'Lịch trình của tôi'}</Button></Link>
        {publicView ? (
          <div>
            <Button type="primary" icon={<CopyOutlined />} loading={copying} onClick={copyItinerary}>Sao chép lịch trình</Button>
            <BookmarkButton bookmark={createItineraryBookmark(itinerary)} showLabel />
            <Dropdown
              menu={{
                onClick: ({ key }) => { if (key === 'report') handleReportClick() },
                items: [{
                  key: 'report',
                  icon: hasReported ? <CheckCircleOutlined /> : <FlagOutlined />,
                  disabled: hasReported || itinerary.owner?.id === user?.id,
                  label: itinerary.owner?.id === user?.id
                    ? 'Không thể báo cáo lịch trình của bạn'
                    : hasReported ? 'Đã báo cáo' : 'Báo cáo',
                }],
              }}
            >
              <Button aria-label="Thêm hành động" icon={<EllipsisOutlined />} />
            </Dropdown>
          </div>
        ) : (
          <div>
            <Link to={`/itineraries/mine/${itinerary.id}/edit`}><Button icon={<EditOutlined />}>Chỉnh sửa</Button></Link>
            <Dropdown menu={{ onClick: ({ key }) => { if (key === 'delete' && !deleting) confirmDelete() }, items: [{ key: 'delete', danger: true, disabled: deleting, icon: <DeleteOutlined />, label: deleting ? 'Đang xóa...' : 'Xóa' }] }}><Button aria-label="Thêm hành động" loading={deleting} icon={<EllipsisOutlined />} /></Dropdown>
          </div>
        )}
      </div>

      <header className={styles.detailHero}>
        <div>
          <div className={styles.detailTags}>
            <Tag color={itinerary.visibility === 'public' ? 'green' : 'default'} icon={itinerary.visibility === 'private' ? <LockOutlined /> : <GlobalOutlined />}>
              {itinerary.visibility === 'public' ? 'Công khai' : 'Riêng tư'}
            </Tag>
            {itinerary.status === 'hidden' ? <Tag color="red">Đã bị ẩn</Tag> : null}
          </div>
          <h1>{itinerary.title}</h1>
          <p>{itinerary.description || 'Một hành trình khám phá Huế được tạo riêng cho bạn.'}</p>
          {publicView && itinerary.owner ? <div className={styles.communityOwner}>Chia sẻ bởi <strong>{itinerary.owner.displayName}</strong></div> : null}
          <div className={styles.updatedLine}>Cập nhật {new Date(itinerary.updatedAt).toLocaleDateString('vi-VN')}</div>
        </div>
        <div className={styles.tripFacts}>
          <span><CalendarOutlined /> <strong>{itinerary.days.length}</strong> ngày</span>
          <span><EnvironmentOutlined /> <strong>{totalItems}</strong> điểm dừng</span>
          {itinerary.startDate ? <span><ClockCircleOutlined /> Bắt đầu {new Date(itinerary.startDate).toLocaleDateString('vi-VN')}</span> : null}
        </div>
      </header>

      {!publicView && itinerary.status === 'hidden' ? (
        <Alert
          showIcon
          type="warning"
          message="Lịch trình đã bị ẩn khỏi cộng đồng"
          description={itinerary.moderation?.hiddenReason ? `Lý do: ${itinerary.moderation.hiddenReason}. Bạn vẫn có thể chỉnh sửa nội dung, nhưng chỉ admin mới có thể hiện lại lịch trình.` : 'Bạn vẫn có thể chỉnh sửa nội dung, nhưng chỉ admin mới có thể hiện lại lịch trình.'}
        />
      ) : null}

      <nav className={styles.dayTabs} aria-label="Chọn ngày">
        {itinerary.days.map((day) => <a href={`#day-${day.dayNumber}`} key={day.dayNumber}>Ngày {day.dayNumber}</a>)}
      </nav>

      <section className={styles.detailDays}>
        {itinerary.days.map((day) => (
          <article className={styles.detailDay} id={`day-${day.dayNumber}`} key={day.dayNumber}>
            <header><span>{day.dayNumber}</span><div><h2>Ngày {day.dayNumber}</h2><small>{day.items.length} điểm dừng</small></div></header>
            <div className={styles.detailTimeline}>
              {[...day.items].sort((left, right) => left.order - right.order).map((item) => (
                <div className={`${styles.detailItem} ${item.availability === 'unavailable' ? styles.unavailableItem : ''}`} key={item.id}>
                  <div className={styles.itemTime}>{item.startTime || `Điểm ${item.order}`}<span>{item.endTime ? `– ${item.endTime}` : ''}</span></div>
                  <div className={styles.timelineDot} />
                  {item.availability === 'unavailable' ? (
                    <div className={styles.unavailableContent}>
                      <WarningOutlined />
                      <div><h3>Địa điểm không còn khả dụng</h3><p>Thông tin được giữ lại để lịch trình không bị thay đổi ngoài ý muốn.</p></div>
                    </div>
                  ) : (
                    <div className={styles.locationContent}>
                      {item.location.coverImageUrl ? <img src={item.location.coverImageUrl} alt="" /> : <div className={styles.imagePlaceholder}><EnvironmentOutlined /></div>}
                      <div>
                        <h3>{item.location.name}</h3>
                        <p><EnvironmentOutlined /> {item.location.formattedAddress}</p>
                        <div className={styles.itemMeta}>
                          {item.durationMinutes ? <span><ClockCircleOutlined /> {item.durationMinutes} phút</span> : null}
                          {item.note ? <span>{item.note}</span> : null}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      {publicView ? (
        <ReportModal
          open={reportOpen}
          targetType="itinerary"
          targetId={itinerary.id}
          contextLabel={`Báo cáo lịch trình "${itinerary.title}"`}
          onClose={() => setReportOpen(false)}
          onSubmitted={() => setReportedItineraryIds((current) => new Set(current).add(itineraryId))}
        />
      ) : null}
    </main>
  )
}

export function CommunityItineraryDetailPage() {
  return <ItineraryDetailPage publicView />
}
