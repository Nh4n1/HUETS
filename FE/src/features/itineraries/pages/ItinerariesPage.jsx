import {
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { Alert, Button, Empty, Modal, Skeleton, Tag, message } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { deleteItineraryApi, getItinerariesApi } from '../api/itineraryApi'
import styles from './Itinerary.module.css'

const errorMessage = (error, fallback) => error.response?.data?.message ?? fallback

const countItems = (itinerary) => itinerary.days.reduce((total, day) => total + day.items.length, 0)

export function ItinerariesPage() {
  const [itineraries, setItineraries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const requestItineraries = () => (
    getItinerariesApi()
      .then((data) => {
        setItineraries(Array.isArray(data) ? data : [])
        setError('')
      })
      .catch((requestError) => setError(errorMessage(requestError, 'Không thể tải danh sách lịch trình.')))
      .finally(() => setLoading(false))
  )

  useEffect(() => {
    let active = true
    getItinerariesApi()
      .then((data) => {
        if (!active) return
        setItineraries(Array.isArray(data) ? data : [])
        setError('')
      })
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError, 'Không thể tải danh sách lịch trình.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const retry = () => {
    setLoading(true)
    requestItineraries()
  }

  const confirmDelete = async () => {
    try {
      setDeleting(true)
      await deleteItineraryApi(deleteTarget.id)
      setItineraries((current) => current.filter((item) => item.id !== deleteTarget.id))
      setDeleteTarget(null)
      message.success('Đã xóa lịch trình.')
    } catch (requestError) {
      message.error(errorMessage(requestError, 'Không thể xóa lịch trình.'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Hành trình của riêng bạn</span>
          <h1>Lịch trình của tôi</h1>
          <p>Sắp xếp những điểm đến yêu thích thành một hành trình thật dễ nhớ.</p>
        </div>
        <Link to="/itineraries/new">
          <Button type="primary" size="large" icon={<PlusOutlined />}>Tạo lịch trình</Button>
        </Link>
      </section>

      <nav className={styles.itineraryTabs} aria-label="Loại lịch trình">
        <Link to="/itineraries">Cộng đồng</Link>
        <Link className={styles.activeTab} to="/itineraries/mine">Của tôi</Link>
      </nav>

      {error ? <Alert showIcon type="error" message={error} action={<Button onClick={retry}>Thử lại</Button>} /> : null}

      {loading ? (
        <div className={styles.cardGrid}>{[1, 2, 3].map((key) => <Skeleton.Node key={key} active className={styles.cardSkeleton} />)}</div>
      ) : null}

      {!loading && !error && itineraries.length === 0 ? (
        <section className={styles.emptyPanel}>
          <Empty description="Bạn chưa có lịch trình nào." />
          <Link to="/itineraries/new"><Button type="primary" icon={<PlusOutlined />}>Tạo lịch trình đầu tiên</Button></Link>
        </section>
      ) : null}

      {!loading && itineraries.length > 0 ? (
        <section className={styles.cardGrid} aria-label="Danh sách lịch trình">
          {itineraries.map((itinerary) => (
            <article className={styles.itineraryCard} key={itinerary.id}>
              <div className={styles.cardTopline}>
                <Tag color={itinerary.visibility === 'public' ? 'green' : 'default'}>
                  {itinerary.visibility === 'public' ? 'Công khai' : 'Riêng tư'}
                </Tag>
                <span>Cập nhật {new Date(itinerary.updatedAt).toLocaleDateString('vi-VN')}</span>
              </div>
              <h2>{itinerary.title}</h2>
              <p className={styles.cardDescription}>{itinerary.description || 'Một hành trình khám phá Huế đang chờ bạn.'}</p>
              <div className={styles.cardStats}>
                <span><CalendarOutlined /> {itinerary.days.length} ngày</span>
                <span><EnvironmentOutlined /> {countItems(itinerary)} địa điểm</span>
              </div>
              <div className={styles.cardActions}>
                <Link to={`/itineraries/mine/${itinerary.id}`}><Button icon={<EyeOutlined />}>Xem</Button></Link>
                <Link to={`/itineraries/mine/${itinerary.id}/edit`}><Button type="text" icon={<EditOutlined />}>Sửa</Button></Link>
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setDeleteTarget(itinerary)}>Xóa</Button>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <Modal
        open={Boolean(deleteTarget)}
        title="Xóa lịch trình?"
        okText="Xóa"
        cancelText="Hủy"
        okButtonProps={{ danger: true, loading: deleting }}
        onOk={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      >
        <p>Lịch trình “{deleteTarget?.title}” sẽ không còn xuất hiện trong tài khoản của bạn.</p>
      </Modal>
    </main>
  )
}
