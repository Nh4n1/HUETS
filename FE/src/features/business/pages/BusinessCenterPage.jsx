import { App, Alert, Button, Card, Empty, Skeleton, Tabs, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { cancelOwnershipApi, getMyOwnershipsApi } from '../api/businessApi'
import { BusinessStatusTag } from '../components/BusinessStatusTag'
import { getLatestReview } from '../ownershipPresentation'
import styles from './BusinessPages.module.css'

const TAB_STATUSES = {
  verified: ['verified'],
  pending: ['pending'],
  rejected: ['rejected'],
  history: ['revoked', 'cancelled'],
}

export function BusinessCenterPage() {
  const { modal, message } = App.useApp()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await getMyOwnershipsApi({ pageSize: 50 })
      setItems(response.data ?? [])
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error.response?.data?.message ?? 'Không thể tải Business Center.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { Promise.resolve().then(load) }, [load])

  function cancelOwnership(item) {
    modal.confirm({
      title: 'Hủy yêu cầu ownership?',
      content: 'Yêu cầu sẽ chuyển vào lịch sử. Bạn có thể gửi yêu cầu mới sau đó.',
      okText: 'Hủy yêu cầu',
      okButtonProps: { danger: true },
      cancelText: 'Giữ yêu cầu',
      onOk: async () => {
        await cancelOwnershipApi(item.id)
        message.success('Đã hủy yêu cầu.')
        await load()
      },
    })
  }

  const tabItems = Object.entries(TAB_STATUSES).map(([key, statuses]) => {
    const filtered = items.filter((item) => statuses.includes(item.status))
    const labels = { verified: 'Đã xác minh', pending: 'Đang xử lý', rejected: 'Cần bổ sung', history: 'Lịch sử' }
    return {
      key,
      label: `${labels[key]} (${filtered.length})`,
      children: filtered.length ? (
        <div className={styles.cardList}>
          {filtered.map((item) => {
            const review = getLatestReview(item)
            return (
              <Card key={item.id} className={styles.ownershipCard}>
                <div className={styles.cardRow}>
                  <div className={styles.stepStack}>
                    <div><BusinessStatusTag ownership={item} /></div>
                    <Typography.Title level={4} style={{ margin: 0 }}>{item.location?.name ?? 'Địa điểm không còn khả dụng'}</Typography.Title>
                    <div className={styles.meta}><span>{item.location?.formattedAddress}</span><span>Cập nhật {new Date(item.updatedAt).toLocaleString('vi-VN')}</span>{review?.reason ? <span>Phản hồi: {review.reason}</span> : null}</div>
                  </div>
                  <div className={styles.actions}>
                    <Link to={`/business/ownerships/${item.id}`}><Button type="primary">{item.status === 'rejected' ? 'Bổ sung bằng chứng' : 'Xem yêu cầu'}</Button></Link>
                    {item.status === 'pending' ? <Button danger onClick={() => cancelOwnership(item)}>Hủy</Button> : null}
                    {item.status === 'verified' && item.location?.status === 'approved' ? <Link to={`/business/locations/${item.locationId}/vouchers`}><Button>Quản lý Voucher</Button></Link> : null}
                    {item.status === 'verified' && item.location?.status === 'approved' ? <Link to={`/business/locations/${item.locationId}/devices`}><Button>Thiết bị quầy</Button></Link> : null}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : <Empty description={`Chưa có mục ${labels[key].toLowerCase()}.`} />,
    }
  })

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div><span className={styles.eyebrow}>HueTrip Business</span><Typography.Title level={2}>Quản lý doanh nghiệp</Typography.Title><p>Quản lý yêu cầu và quyền Business theo từng Location.</p></div>
        <Link to="/business/register"><Button type="primary" size="large" icon={<PlusOutlined />}>Thêm địa điểm kinh doanh</Button></Link>
      </header>
      {errorMessage ? <Alert type="error" showIcon message={errorMessage} action={<Button onClick={load}>Thử lại</Button>} /> : null}
      {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : <Tabs className={styles.tabs} items={tabItems} />}
    </main>
  )
}
