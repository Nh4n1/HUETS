import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  FlagOutlined,
  StarFilled,
} from '@ant-design/icons'
import { Alert, Button, Image, Skeleton } from 'antd'
import { useEffect, useState } from 'react'
import { Link, useLocation as useRouterLocation, useNavigate, useParams } from 'react-router'
import { getPublicLocationByIdApi } from '../api/locationApi'
import { useAuth } from '../../auth/context/useAuth'
import { BookmarkButton } from '../../bookmarks/components/BookmarkButton'
import { createLocationBookmark } from '../../bookmarks/utils/bookmarkMappers'
import { ReportModal } from '../../reports/components/ReportModal'
import { LocationMap } from '../components/LocationMap'
import { LocationReviews } from '../components/LocationReviews'
import { getOpeningHoursRows, getRatingLabel, getTagLabel } from '../locationPresentation'
import styles from './LocationDetailPage.module.css'

function DetailSkeleton() {
  return (
    <main className={styles.page} aria-label="Đang tải địa điểm">
      <Skeleton active paragraph={{ rows: 2 }} />
      <div className={styles.skeletonHero} />
      <Skeleton active paragraph={{ rows: 8 }} />
    </main>
  )
}

export function LocationDetailPage() {
  const { locationId } = useParams()
  const navigate = useNavigate()
  const routerLocation = useRouterLocation()
  const { isAuthenticated } = useAuth()
  const [location, setLocation] = useState(null)
  const [loadedRequestKey, setLoadedRequestKey] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [reportOpen, setReportOpen] = useState(false)
  const requestKey = `${locationId}|${reloadKey}`

  const handleReportClick = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: routerLocation } })
      return
    }
    setReportOpen(true)
  }

  useEffect(() => {
    let active = true
    getPublicLocationByIdApi(locationId)
      .then((data) => {
        if (!active) return
        setLocation(data)
        setErrorMessage('')
      })
      .catch((error) => {
        if (!active) return
        setLocation(null)
        setErrorMessage(
          error.response?.status === 404
            ? 'Địa điểm này không tồn tại hoặc chưa được công khai.'
            : error.response?.data?.message ?? 'Không thể tải thông tin địa điểm.',
        )
      })
      .finally(() => {
        if (active) setLoadedRequestKey(requestKey)
      })
    return () => { active = false }
  }, [locationId, reloadKey, requestKey])

  const loading = loadedRequestKey !== requestKey
  if (loading) return <DetailSkeleton />

  if (!location) {
    return (
      <main className={styles.errorPage}>
        <Alert type="error" showIcon message={errorMessage} />
        <div>
          <Link to="/locations"><Button icon={<ArrowLeftOutlined />}>Về danh sách</Button></Link>
          <Button type="primary" onClick={() => setReloadKey((value) => value + 1)}>Thử lại</Button>
        </div>
      </main>
    )
  }

  const openingRows = getOpeningHoursRows(location.openingHours)
  const [coverImage, ...otherImages] = location.images ?? []
  const mapUrl = `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=17/${location.latitude}/${location.longitude}`

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} to="/locations">
        <ArrowLeftOutlined /> Quay lại danh sách
      </Link>

      <header className={styles.header}>
        <div>
          <span className={styles.category}>{location.category?.name}</span>
          <h1>{location.name}</h1>
          <p className={styles.address}><EnvironmentOutlined /> {location.formattedAddress}</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.rating}>
            <StarFilled />
            <div><strong>{getRatingLabel(location)}</strong><span>Đánh giá cộng đồng</span></div>
          </div>
          <BookmarkButton
            bookmark={createLocationBookmark(location)}
            showLabel
            savedLabel="Đã lưu địa điểm"
            unsavedLabel="Lưu địa điểm"
            className={styles.bookmarkAction}
          />
          <Button icon={<FlagOutlined />} onClick={handleReportClick}>
            Báo cáo
          </Button>
        </div>
      </header>

      <Image.PreviewGroup>
        <section
          className={`${styles.gallery} ${otherImages.length === 0 ? styles.gallerySingleImage : ''}`}
          aria-label="Ảnh địa điểm"
        >
          {coverImage ? (
            <Image className={styles.coverImage} src={coverImage.url} alt={`Không gian tại ${location.name}`} />
          ) : (
            <div className={styles.imageFallback}><EnvironmentOutlined /><span>Chưa có ảnh địa điểm</span></div>
          )}
          {otherImages.length > 0 ? (
            <div className={styles.thumbnailGrid}>
              {otherImages.slice(0, 4).map((image) => (
                <Image key={image.id} src={image.url} alt={`Ảnh ${location.name}`} />
              ))}
            </div>
          ) : null}
        </section>
      </Image.PreviewGroup>

      <div className={styles.layout}>
        <article className={styles.mainContent}>
          <section className={styles.section}>
            <span className={styles.eyebrow}>Câu chuyện địa điểm</span>
            <h2>Về {location.name}</h2>
            <p className={styles.description}>{location.description}</p>
            {location.aliases?.length ? (
              <p className={styles.aliases}><strong>Còn được biết đến là:</strong> {location.aliases.join(', ')}</p>
            ) : null}
          </section>

          {location.tagCodes?.length ? (
            <section className={styles.section}>
              <span className={styles.eyebrow}>Trải nghiệm</span>
              <h2>Điểm nổi bật</h2>
              <div className={styles.tags}>
                {location.tagCodes.map((code) => <span key={code}>{getTagLabel(code)}</span>)}
              </div>
            </section>
          ) : null}

          <section className={styles.section}>
            <span className={styles.eyebrow}>Bản đồ</span>
            <h2>Vị trí</h2>
            <div className={styles.mapWrap}>
              <LocationMap latitude={location.latitude} longitude={location.longitude} label={location.name} />
            </div>
            <a className={styles.externalMap} href={mapUrl} target="_blank" rel="noreferrer">
              Mở trên OpenStreetMap
            </a>
          </section>
          <LocationReviews
            locationId={locationId}
            ratingSummary={{
              average: location.averageRating,
              count: location.reviewCount,
              distribution: location.ratingDistribution,
            }}
            onSummaryChange={(summary) => setLocation((current) => ({
              ...current,
              averageRating: summary.average,
              reviewCount: summary.count,
              ratingDistribution: summary.distribution,
            }))}
          />
        </article>

        <aside className={styles.infoCard}>
          <h2>Thông tin hữu ích</h2>
          <div className={styles.infoBlock}>
            <EnvironmentOutlined />
            <div>
              <strong>Địa chỉ</strong>
              <span>{location.address?.addressLine}</span>
              <span>{location.address?.wardName}, Thành phố Huế</span>
              {location.address?.locationNote ? <small>{location.address.locationNote}</small> : null}
            </div>
          </div>
          <div className={styles.infoBlock}>
            <ClockCircleOutlined />
            <div className={styles.openingHours}>
              <strong>Giờ hoạt động</strong>
              {openingRows.length ? openingRows.map((row) => (
                <span key={row.dayLabel}><b>{row.dayLabel}</b><em>{row.hours}</em></span>
              )) : <span>Chưa có thông tin giờ hoạt động</span>}
            </div>
          </div>
        </aside>
      </div>

      <ReportModal
        open={reportOpen}
        targetType="location"
        targetId={location.id}
        contextLabel={`Báo cáo địa điểm "${location.name}"`}
        onClose={() => setReportOpen(false)}
      />
    </main>
  )
}
