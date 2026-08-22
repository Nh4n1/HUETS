import { ArrowLeftOutlined, CalendarOutlined, ClockCircleOutlined, EnvironmentOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Descriptions, Empty, Input, Modal, Space, Spin, Tag, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getAdminItineraryApi, moderateItineraryApi } from '../../api/adminItinerariesApi'
import styles from '../AdminPage.module.css'

const requestErrorMessage = (error, fallback) => error.response?.data?.message ?? fallback

export function AdminItineraryDetailPage() {
  const { itineraryId } = useParams()
  const [itinerary, setItinerary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [hideModalOpen, setHideModalOpen] = useState(false)
  const [hideReason, setHideReason] = useState('')

  const loadItinerary = () => {
    setLoading(true)
    getAdminItineraryApi(itineraryId)
      .then((data) => { setItinerary(data); setError('') })
      .catch((requestError) => setError(requestErrorMessage(requestError, 'Không thể tải lịch trình.')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let active = true
    getAdminItineraryApi(itineraryId)
      .then((data) => { if (active) { setItinerary(data); setError('') } })
      .catch((requestError) => { if (active) setError(requestErrorMessage(requestError, 'Không thể tải lịch trình.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [itineraryId])

  const updateStatus = async (status, reason) => {
    try {
      setUpdating(true)
      const updated = await moderateItineraryApi(itineraryId, { status, ...(reason ? { reason } : {}) })
      setItinerary((current) => ({ ...updated, owner: current.owner }))
      setHideModalOpen(false)
      setHideReason('')
      message.success(status === 'hidden' ? 'Đã ẩn lịch trình khỏi cộng đồng.' : 'Đã hiện lại lịch trình.')
    } catch (requestError) {
      message.error(requestErrorMessage(requestError, 'Không thể cập nhật lịch trình.'))
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <div className="page-container"><Spin size="large" tip="Đang tải lịch trình..." /></div>
  if (error) return <main className={`${styles.page} page-container`}><Alert showIcon type="error" message={error} action={<Button onClick={loadItinerary}>Thử lại</Button>} /></main>
  if (!itinerary) return <main className={`${styles.page} page-container`}><Empty description="Không tìm thấy lịch trình công khai." /></main>

  const stopCount = itinerary.days.reduce((total, day) => total + day.items.length, 0)

  return (
    <main className={`${styles.page} page-container`}>
      <Link className={styles.backLink} to="/admin/itineraries"><ArrowLeftOutlined /> Quay lại danh sách</Link>

      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>Chi tiết kiểm duyệt</span>
          <Typography.Title level={2}>{itinerary.title}</Typography.Title>
          <Space wrap>
            <Tag color="blue">Công khai</Tag>
            <Tag color={itinerary.status === 'hidden' ? 'orange' : 'green'}>{itinerary.status === 'hidden' ? 'Đã ẩn' : 'Đang hiển thị'}</Tag>
          </Space>
        </div>
        <div className={styles.headerActions}>
          {itinerary.status === 'hidden'
            ? <Button type="primary" icon={<EyeOutlined />} loading={updating} onClick={() => updateStatus('active')}>Hiện lại</Button>
            : <Button danger icon={<EyeInvisibleOutlined />} onClick={() => setHideModalOpen(true)}>Ẩn lịch trình</Button>}
        </div>
      </header>

      {itinerary.status === 'hidden' ? (
        <Alert
          showIcon
          type="warning"
          message="Lịch trình đã bị ẩn khỏi cộng đồng"
          description={itinerary.moderation?.hiddenReason ? `Lý do: ${itinerary.moderation.hiddenReason}` : undefined}
        />
      ) : null}

      <section className={styles.detailStack}>
        <Card title="Thông tin chung">
          <Descriptions column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Chủ sở hữu">{itinerary.owner?.displayName ?? 'Không xác định'}</Descriptions.Item>
            <Descriptions.Item label="Ngày bắt đầu">{itinerary.startDate ? new Date(itinerary.startDate).toLocaleDateString('vi-VN') : 'Chưa xác định'}</Descriptions.Item>
            <Descriptions.Item label="Số ngày"><CalendarOutlined /> {itinerary.days.length}</Descriptions.Item>
            <Descriptions.Item label="Điểm dừng"><EnvironmentOutlined /> {stopCount}</Descriptions.Item>
            <Descriptions.Item label="Cập nhật">{new Date(itinerary.updatedAt).toLocaleString('vi-VN')}</Descriptions.Item>
          </Descriptions>
          <Typography.Paragraph>{itinerary.description || 'Không có mô tả.'}</Typography.Paragraph>
        </Card>

        {itinerary.days.map((day) => (
          <Card key={day.dayNumber} title={`Ngày ${day.dayNumber}`} extra={`${day.items.length} điểm dừng`}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {[...day.items].sort((left, right) => left.order - right.order).map((item) => (
                <Card key={item.id} size="small">
                  <Space align="start">
                    <Tag>{item.startTime || `Điểm ${item.order}`}{item.endTime ? ` – ${item.endTime}` : ''}</Tag>
                    <div>
                      <Typography.Text strong>{item.location?.name ?? 'Địa điểm không còn khả dụng'}</Typography.Text>
                      <div>{item.location?.formattedAddress ?? 'Thông tin địa điểm hiện không thể truy cập.'}</div>
                      {item.durationMinutes ? <Typography.Text type="secondary"><ClockCircleOutlined /> {item.durationMinutes} phút</Typography.Text> : null}
                      {item.note ? <Typography.Paragraph>{item.note}</Typography.Paragraph> : null}
                    </div>
                  </Space>
                </Card>
              ))}
            </Space>
          </Card>
        ))}
      </section>

      <Modal
        title="Ẩn lịch trình khỏi cộng đồng"
        open={hideModalOpen}
        okText="Ẩn lịch trình"
        cancelText="Huỷ"
        okButtonProps={{ danger: true, loading: updating }}
        onCancel={() => { setHideModalOpen(false); setHideReason('') }}
        onOk={() => {
          if (!hideReason.trim()) { message.warning('Vui lòng nhập lý do ẩn.'); return }
          updateStatus('hidden', hideReason.trim())
        }}
      >
        <Input.TextArea rows={4} maxLength={500} showCount placeholder="Lý do ẩn (bắt buộc)" value={hideReason} onChange={(event) => setHideReason(event.target.value)} />
      </Modal>
    </main>
  )
}
