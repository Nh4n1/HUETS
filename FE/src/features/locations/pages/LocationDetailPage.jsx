import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  FlagOutlined,
  StarFilled,
} from '@ant-design/icons'
import { Alert, Button, Image, Skeleton } from 'antd'
import { useEffect, useState } from 'react'
import { Link, useLocation as useRouterLocation, useNavigate, useParams } from 'react-router'
import { getPublicLocationByIdApi, getPublicLocationsApi } from '../api/locationApi'
import { useAuth } from '../../auth/context/useAuth'
import { BookmarkButton } from '../../bookmarks/components/BookmarkButton'
import { createLocationBookmark } from '../../bookmarks/utils/bookmarkMappers'
import { ReportModal } from '../../reports/components/ReportModal'
import { LocationMap } from '../components/LocationMap'
import { LocationReviews } from '../components/LocationReviews'
import { LocationOpeningHours } from '../components/LocationOpeningHours'
import { LocationDiscoveryCard } from '../components/LocationDiscoveryCard'
import { getRatingLabel, getTagLabel } from '../locationPresentation'
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
  const [reportedLocationIds, setReportedLocationIds] = useState(() => new Set())
  const [unavailableReportIds, setUnavailableReportIds] = useState(() => new Set())
  const [relatedLocations, setRelatedLocations] = useState([])
  const [relatedLoading, setRelatedLoading] = useState(false)
  const [relatedError, setRelatedError] = useState('')
  const requestKey = `${locationId}|${reloadKey}`
  const hasReported = reportedLocationIds.has(locationId)
  const reportUnavailable = unavailableReportIds.has(locationId)

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

  useEffect(() => {
    const categoryCode = location?.category?.code
    if (!categoryCode) return undefined
    let active = true
    Promise.resolve().then(() => active && setRelatedLoading(true))
    getPublicLocationsApi({ page: 1, pageSize: 5, categoryCode, sortBy: 'recommended' })
      .then((payload) => {
        if (!active) return
        setRelatedLocations((payload.data ?? []).filter((item) => item.id !== locationId).slice(0, 4))
        setRelatedError('')
      })
      .catch(() => active && setRelatedError('Không thể tải các địa điểm liên quan.'))
      .finally(() => active && setRelatedLoading(false))
    return () => { active = false }
  }, [location?.category?.code, locationId])

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
          <div className={styles.detailMeta}>
            <span><StarFilled /> {getRatingLabel(location)}</span>
            <span><EnvironmentOutlined /> {location.formattedAddress}</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <BookmarkButton
            bookmark={createLocationBookmark(location)}
            showLabel
            savedLabel="Đã lưu địa điểm"
            unsavedLabel="Lưu địa điểm"
            className={styles.bookmarkAction}
          />
          <Button type="primary" icon={<CalendarOutlined />} onClick={() => {
            const destination = `/itineraries/new?locationId=${encodeURIComponent(location.id)}`
            navigate(isAuthenticated ? destination : '/login', isAuthenticated ? undefined : { state: { from: { pathname: destination } } })
          }}>
            Thêm vào lịch trình
          </Button>
          <Button
            icon={hasReported ? <CheckCircleOutlined /> : <FlagOutlined />}
            disabled={hasReported || reportUnavailable}
            onClick={handleReportClick}
          >
            {hasReported ? 'Đã báo cáo' : reportUnavailable ? 'Không thể báo cáo' : 'Báo cáo'}
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

          <LocationOpeningHours openingHours={location.openingHours} />

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
          <div className={styles.sideCard}>
            <h2>Thông tin hữu ích</h2>
            <div className={styles.sideRow}><span>Danh mục</span><strong>{location.category?.name}</strong></div>
            <div className={styles.sideRow}><span>Khu vực</span><strong>{location.address?.wardName}</strong></div>
            <div className={styles.sideRow}><span>Đánh giá</span><strong>{getRatingLabel(location)}</strong></div>
            {location.address?.locationNote ? <p className={styles.sideNote}>{location.address.locationNote}</p> : null}
          </div>
          <div className={styles.sideCard}>
            <h2>Lên kế hoạch</h2>
            <p className={styles.sideNote}>Bắt đầu một lịch trình mới với địa điểm này được điền sẵn ở ngày đầu tiên.</p>
            <Button block type="primary" icon={<CalendarOutlined />} onClick={() => {
              const destination = `/itineraries/new?locationId=${encodeURIComponent(location.id)}`
              navigate(isAuthenticated ? destination : '/login', isAuthenticated ? undefined : { state: { from: { pathname: destination } } })
            }}>Thêm vào lịch trình</Button>
          </div>
          <div className={styles.sideCard}>
            <h2>Thông tin chưa chính xác?</h2>
            <p className={styles.sideNote}>Báo cáo nội dung sai, spam hoặc không phù hợp. Góp ý về website dùng kênh Feedback riêng.</p>
            <Button block icon={<FlagOutlined />} disabled={hasReported || reportUnavailable} onClick={handleReportClick}>
              {hasReported ? 'Đã báo cáo' : 'Báo cáo địa điểm'}
            </Button>
          </div>
        </aside>
      </div>

      <section className={styles.relatedSection} aria-labelledby="related-heading">
        <span className={styles.eyebrow}>Tiếp tục khám phá</span>
        <h2 id="related-heading">Địa điểm liên quan</h2>
        {relatedError ? <Alert type="warning" showIcon message={relatedError} /> : null}
        {relatedLoading ? <div className={styles.relatedGrid}>{[0, 1, 2, 3].map((item) => <Skeleton.Node active key={item} />)}</div> : null}
        {!relatedLoading && !relatedError && relatedLocations.length ? (
          <div className={styles.relatedGrid}>{relatedLocations.map((item) => <LocationDiscoveryCard key={item.id} location={item} />)}</div>
        ) : null}
      </section>

      <ReportModal
        open={reportOpen}
        targetType="location"
        targetId={location.id}
        contextLabel={`Báo cáo địa điểm "${location.name}"`}
        onClose={() => setReportOpen(false)}
        onSubmitted={() => setReportedLocationIds((current) => new Set(current).add(locationId))}
        onUnavailable={() => setUnavailableReportIds((current) => new Set(current).add(locationId))}
      />
    </main>
  )
}
