import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  EditOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  HistoryOutlined,
  SendOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { Alert, App, Button, Image, Skeleton, Tag, Timeline, Typography } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { LocationMap } from '../components/LocationMap'
import { LocationOpeningHours } from '../components/LocationOpeningHours'
import {
  getMyLocationApi,
  resubmitMyLocationApi,
  withdrawMyLocationApi,
} from '../api/myLocationsApi'
import { formatDateTime, LOCATION_STATUS } from '../myLocationsPresentation'
import { getTagLabel } from '../locationPresentation'
import styles from './LocationWorkflowPage.module.css'

const STATUS_COPY = {
  pending: {
    type: 'info',
    title: 'Địa điểm đang chờ kiểm duyệt',
    description: 'Bạn vẫn có thể chỉnh sửa hoặc rút đóng góp trong thời gian chờ.',
  },
  approved: {
    type: 'success',
    title: 'Địa điểm đã được công khai',
    description: 'Mọi người có thể tìm kiếm và xem địa điểm này trên Huế Trip.',
  },
  rejected: {
    type: 'warning',
    title: 'Địa điểm cần được bổ sung',
    description: 'Xem phản hồi, chỉnh sửa thông tin rồi gửi lại để đội ngũ kiểm duyệt xem xét.',
  },
  withdrawn: {
    type: 'info',
    title: 'Bạn đã rút đóng góp này',
    description: 'Thông tin vẫn được lưu trong lịch sử đóng góp của bạn.',
  },
  hidden: {
    type: 'warning',
    title: 'Địa điểm hiện đang bị ẩn',
    description: 'Địa điểm không còn xuất hiện công khai. Bạn vẫn có thể xem toàn bộ thông tin đã gửi.',
  },
}

function DetailSkeleton() {
  return <main className={styles.page}><Skeleton active paragraph={{ rows: 12 }} /></main>
}

export function MyContributionDetailPage() {
  const { locationId } = useParams()
  const { message, modal } = App.useApp()
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const loadLocation = useCallback(async () => {
    try {
      setLocation(await getMyLocationApi(locationId))
      setErrorMessage('')
    } catch (error) {
      setLocation(null)
      setErrorMessage(error.response?.data?.message ?? 'Không thể tải thông tin địa điểm đã đóng góp.')
    } finally {
      setLoading(false)
    }
  }, [locationId])

  useEffect(() => {
    let active = true
    getMyLocationApi(locationId)
      .then((data) => {
        if (!active) return
        setLocation(data)
        setErrorMessage('')
      })
      .catch((error) => {
        if (!active) return
        setLocation(null)
        setErrorMessage(error.response?.data?.message ?? 'Không thể tải thông tin địa điểm đã đóng góp.')
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [locationId])

  async function runAction(action, successText) {
    setActionLoading(action)
    try {
      const request = action === 'resubmit' ? resubmitMyLocationApi : withdrawMyLocationApi
      const updated = await request(locationId, {
        expectedStatus: location.status,
        expectedUpdatedAt: location.updatedAt,
      })
      setLocation(updated)
      message.success(successText)
    } catch (error) {
      const text = error.response?.data?.message ?? 'Không thể thực hiện thao tác. Vui lòng thử lại.'
      message.error(text)
      if (error.response?.data?.code === 'STALE_RESOURCE') await loadLocation()
    } finally {
      setActionLoading('')
    }
  }

  function confirmResubmit() {
    modal.confirm({
      title: 'Gửi lại địa điểm để kiểm duyệt?',
      content: 'Hãy chắc chắn bạn đã cập nhật các nội dung theo phản hồi của kiểm duyệt viên.',
      okText: 'Gửi duyệt lại',
      cancelText: 'Để sau',
      onOk: () => runAction('resubmit', 'Đã gửi lại địa điểm để kiểm duyệt.'),
    })
  }

  function confirmWithdraw() {
    modal.confirm({
      title: 'Rút đóng góp địa điểm?',
      content: 'Địa điểm sẽ không còn nằm trong hàng chờ kiểm duyệt. Thao tác này không thể hoàn tác.',
      okText: 'Rút đóng góp',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: () => runAction('withdraw', 'Đã rút đóng góp địa điểm.'),
    })
  }

  if (loading) return <DetailSkeleton />
  if (!location) {
    return (
      <main className={styles.page}>
        <Alert type="error" showIcon message={errorMessage} />
        <Link to="/locations/mine"><Button icon={<ArrowLeftOutlined />}>Về danh sách đóng góp</Button></Link>
      </main>
    )
  }

  const presentation = LOCATION_STATUS[location.status] ?? { label: location.status, color: 'default' }
  const statusCopy = STATUS_COPY[location.status] ?? STATUS_COPY.pending
  const canEdit = ['pending', 'rejected'].includes(location.status)
  const canWithdraw = ['pending', 'rejected'].includes(location.status)
  const [coverImage, ...otherImages] = location.images ?? []

  return (
    <main className={`${styles.page} ${styles.detailPage}`}>
      <Link className={styles.backLink} to="/locations/mine">
        <ArrowLeftOutlined /> Địa điểm tôi đã đóng góp
      </Link>

      <header className={styles.detailHeader}>
        <div>
          <div className={styles.detailStatusLine}>
            <span className={styles.eyebrow}>Hồ sơ đóng góp</span>
            <Tag color={presentation.color}>{presentation.label}</Tag>
          </div>
          <Typography.Title level={1}>{location.name}</Typography.Title>
          <p><EnvironmentOutlined /> {location.formattedAddress}</p>
        </div>
        <div className={styles.detailActions}>
          {canEdit ? (
            <Link to={`/locations/mine/${location.id}/edit`}>
              <Button type="primary" icon={<EditOutlined />}>Chỉnh sửa thông tin</Button>
            </Link>
          ) : null}
          {location.status === 'rejected' ? (
            <Button icon={<SendOutlined />} loading={actionLoading === 'resubmit'} onClick={confirmResubmit}>
              Gửi duyệt lại
            </Button>
          ) : null}
          {location.status === 'approved' ? (
            <Link to={`/locations/${location.id}`}><Button icon={<EyeOutlined />}>Xem trang công khai</Button></Link>
          ) : null}
          {canWithdraw ? (
            <Button danger icon={<StopOutlined />} loading={actionLoading === 'withdraw'} onClick={confirmWithdraw}>
              Rút đóng góp
            </Button>
          ) : null}
        </div>
      </header>

      <Alert
        className={styles.statusAlert}
        type={statusCopy.type}
        showIcon
        message={statusCopy.title}
        description={statusCopy.description}
      />
      {location.status === 'rejected' && location.moderation?.rejectionReason ? (
        <section className={styles.reviewNote}>
          <span>Phản hồi từ kiểm duyệt viên</span>
          <p>{location.moderation.rejectionReason}</p>
        </section>
      ) : null}
      {location.status === 'hidden' && location.moderation?.hiddenReason ? (
        <section className={styles.reviewNote}>
          <span>Lý do địa điểm bị ẩn</span>
          <p>{location.moderation.hiddenReason}</p>
        </section>
      ) : null}

      <Image.PreviewGroup>
        <section className={styles.contributionGallery} aria-label="Ảnh địa điểm đã đóng góp">
          {coverImage ? <Image src={coverImage.url} alt={location.name} /> : <div className={styles.galleryFallback}><EnvironmentOutlined /> Chưa có ảnh</div>}
          {otherImages.length ? (
            <div>{otherImages.slice(0, 4).map((image) => <Image key={image.id} src={image.url} alt={location.name} />)}</div>
          ) : null}
        </section>
      </Image.PreviewGroup>

      <div className={styles.detailGrid}>
        <div className={styles.detailMain}>
          <section className={styles.detailSection}>
            <span className={styles.eyebrow}>Nội dung đã gửi</span>
            <h2>Mô tả địa điểm</h2>
            <p className={styles.description}>{location.description}</p>
            {location.aliases?.length ? <p><strong>Tên gọi khác:</strong> {location.aliases.join(', ')}</p> : null}
          </section>

          <section className={styles.detailSection}>
            <span className={styles.eyebrow}>Thông tin vị trí</span>
            <h2>Địa chỉ và bản đồ</h2>
            <div className={styles.infoTiles}>
              <div><span>Phường/xã</span><strong>{location.address?.wardName}</strong></div>
              <div><span>Địa chỉ</span><strong>{location.address?.addressLine}</strong></div>
              {location.address?.locationNote ? <div><span>Ghi chú vị trí</span><strong>{location.address.locationNote}</strong></div> : null}
            </div>
            <div className={styles.mapWrap}>
              <LocationMap latitude={location.latitude} longitude={location.longitude} label={location.name} />
            </div>
          </section>

          <LocationOpeningHours openingHours={location.openingHours} />

          {location.tagCodes?.length ? (
            <section className={styles.detailSection}>
              <span className={styles.eyebrow}>Đặc điểm</span>
              <h2>Thông tin phân loại</h2>
              <div className={styles.tagList}>{location.tagCodes.map((code) => <Tag key={code}>{getTagLabel(code)}</Tag>)}</div>
            </section>
          ) : null}
        </div>

        <aside className={styles.detailAside}>
          <section className={styles.summaryCard}>
            <h2><CheckCircleOutlined /> Thông tin hồ sơ</h2>
            <dl>
              <div><dt>Danh mục</dt><dd>{location.category?.name}</dd></div>
              <div><dt>Gửi lần gần nhất</dt><dd>{formatDateTime(location.moderation?.submittedAt)}</dd></div>
              <div><dt>Cập nhật</dt><dd>{formatDateTime(location.updatedAt)}</dd></div>
              {location.moderation?.reviewedAt ? <div><dt>Kiểm duyệt</dt><dd>{formatDateTime(location.moderation.reviewedAt)}</dd></div> : null}
            </dl>
          </section>

          <section className={styles.summaryCard}>
            <h2><HistoryOutlined /> Lịch sử chỉnh sửa</h2>
            {location.editHistory?.length ? (
              <Timeline items={location.editHistory.map((entry) => ({
                children: <><strong>{entry.reason}</strong><span className={styles.timelineDate}>{formatDateTime(entry.editedAt)}</span></>,
              }))} />
            ) : <Typography.Text type="secondary">Chưa có lần chỉnh sửa nào.</Typography.Text>}
          </section>
        </aside>
      </div>
    </main>
  )
}
